/* global __dirname, Buffer */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');

const KEYFRAMES_PATH = path.join(
  __dirname,
  '..',
  'reference',
  'arnis_dot4_execution_keyframes_v1.json'
);
const keyframesDoc = JSON.parse(fs.readFileSync(KEYFRAMES_PATH, 'utf8'));

/**
 * Map strikeNumber (1..12) to its manually reviewed zero-based keyframe and timestamp.
 */
const STRIKE_KEYFRAMES = {};
for (const entry of keyframesDoc.keyframes || []) {
  STRIKE_KEYFRAMES[entry.strikeNumber] = {
    frame: entry.reviewedFrameZeroBased,
    timestamp: entry.reviewedTimestampSeconds,
    fps: entry.sourceFPS || 30.0,
    sourceVideo: entry.sourceVideo,
  };
}

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'reference');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let hadError = false;

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/assets/videos/')) {
    const videoName = path.basename(req.url);
    const videoPath = path.join(__dirname, '..', 'assets', 'videos', videoName);
    if (fs.existsSync(videoPath)) {
      const stat = fs.statSync(videoPath);
      const total = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': 'video/mp4',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'video/mp4',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(videoPath).pipe(res);
      }
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { strikeId, frame, timestamp, seekTime, duration, width, height, imageBase64 } = JSON.parse(body);
        const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(OUTPUT_DIR, `${strikeId}_impact.jpg`);
        fs.writeFileSync(filePath, buffer);
        const kb = (buffer.length / 1024).toFixed(1);
        console.log(
          `[Extracted] ${strikeId}_impact.jpg | frame=${frame} | timestamp=${timestamp}s | seek=${seekTime.toFixed(4)}s (dur=${duration.toFixed(2)}s) | ${width}x${height} | ${kb} KB`
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        hadError = true;
        console.error('Error saving image:', err);
        res.writeHead(500);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/error') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      hadError = true;
      console.error('[Extractor Error]', body);
      res.writeHead(200);
      res.end('Logged');
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/complete') {
    console.log(
      hadError
        ? 'Coach snapshot extraction finished with errors.'
        : 'All coach impact snapshots successfully extracted!'
    );
    res.writeHead(200);
    res.end('Done');
    setTimeout(() => {
      process.exit(hadError ? 1 : 0);
    }, 500);
    return;
  }

  // HTML extractor page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Coach Snapshot Extractor</title></head>
    <body style="background: #111; color: #fff; font-family: sans-serif; padding: 20px;">
      <h2>Extracting 12 Strike Coach Impact Snapshots...</h2>
      <div id="log"></div>
      <canvas id="canvas" style="display:none;"></canvas>

      <script>
        const STRIKE_KEYFRAMES = ${JSON.stringify(STRIKE_KEYFRAMES)};
        const logEl = document.getElementById('log');

        function log(msg) {
          logEl.innerHTML += '<p>' + msg + '</p>';
        }

        async function processStrike(strikeNum) {
          const kf = STRIKE_KEYFRAMES[strikeNum];
          const strikeId = 'strike_' + strikeNum;
          if (!kf) {
            await fetch('/error', {
              method: 'POST',
              body: 'Missing keyframe entry for ' + strikeId
            });
            return;
          }

          const seekTime = (kf.frame + 0.25) / (kf.fps || 30.0);
          log('Processing ' + strikeId + ' at frame ' + kf.frame + ' (' + seekTime.toFixed(4) + 's)...');

          return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = '/assets/videos/' + strikeId + '.mp4';
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = async () => {
              if (video.duration < kf.timestamp || seekTime >= video.duration) {
                await fetch('/error', {
                  method: 'POST',
                  body: strikeId + ' video duration (' + video.duration + 's) is shorter than target timestamp (' + kf.timestamp + 's)'
                });
                resolve();
                return;
              }
              video.currentTime = seekTime;
            };

            video.onseeked = async () => {
              try {
                const canvas = document.getElementById('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

                await fetch('/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    strikeId,
                    frame: kf.frame,
                    timestamp: kf.timestamp,
                    seekTime,
                    duration: video.duration,
                    width: canvas.width,
                    height: canvas.height,
                    imageBase64: dataUrl
                  })
                });

                log('✓ Successfully saved ' + strikeId);
                resolve();
              } catch (e) {
                await fetch('/error', {
                  method: 'POST',
                  body: 'Error processing ' + strikeId + ': ' + e.message
                });
                log('✗ Error processing ' + strikeId + ': ' + e.message);
                resolve();
              }
            };

            video.onerror = async () => {
              await fetch('/error', {
                method: 'POST',
                body: 'Failed to load video for ' + strikeId
              });
              log('✗ Failed to load video for ' + strikeId);
              resolve();
            };
          });
        }

        async function runAll() {
          for (let i = 1; i <= 12; i++) {
            await processStrike(i);
          }
          log('All strikes processed! Notifying server...');
          await fetch('/complete', { method: 'POST' });
        }

        runAll();
      </script>
    </body>
    </html>
  `);
});

function launchBrowser(port) {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Extractor server started on ${url}`);
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  exec(`"${edgePath}" --headless --disable-gpu ${url}`, (err) => {
    if (err) {
      console.error('Edge execution error:', err.message);
    }
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn('Port 8999 is busy, falling back to an ephemeral port...');
    server.listen(0, '127.0.0.1', () => {
      launchBrowser(server.address().port);
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(8999, '127.0.0.1', () => {
  launchBrowser(server.address().port);
});
