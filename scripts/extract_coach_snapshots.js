const fs = require('fs');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');

const STRIKE_IMPACTS = {
  1: 1.47,
  2: 1.27,
  3: 1.37,
  4: 3.47,
  5: 3.87,
  6: 0.43,
  7: 1.63,
  8: 2.63,
  9: 3.27,
  10: 0.10,
  11: 0.97,
  12: 1.43,
};

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'reference');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/assets/videos/')) {
    const videoName = path.basename(req.url);
    const videoPath = path.join(__dirname, '..', 'assets', 'videos', videoName);
    if (fs.existsSync(videoPath)) {
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { strikeId, imageBase64 } = JSON.parse(body);
        const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, '');
        const filePath = path.join(OUTPUT_DIR, `${strikeId}_impact.jpg`);
        fs.writeFileSync(filePath, base64Data, 'base64');
        console.log(`[Extracted] Saved ${strikeId}_impact.jpg (${Math.round(base64Data.length / 1024)} KB)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        console.error('Error saving image:', err);
        res.writeHead(500);
        res.end();
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/complete') {
    console.log('All coach impact snapshots successfully extracted!');
    res.writeHead(200);
    res.end('Done');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
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
        const STRIKE_IMPACTS = ${JSON.stringify(STRIKE_IMPACTS)};
        const logEl = document.getElementById('log');

        function log(msg) {
          logEl.innerHTML += '<p>' + msg + '</p>';
        }

        async function processStrike(strikeNum) {
          const impactTime = STRIKE_IMPACTS[strikeNum];
          const strikeId = 'strike_' + strikeNum;
          log('Processing ' + strikeId + ' at ' + impactTime + 's...');

          return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = '/assets/videos/' + strikeId + '.mp4';
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = () => {
              video.currentTime = Math.min(impactTime, video.duration - 0.1);
            };

            video.onseeked = async () => {
              try {
                const canvas = document.getElementById('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

                await fetch('/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ strikeId, imageBase64: dataUrl })
                });

                log('✓ Successfully saved ' + strikeId);
                resolve();
              } catch (e) {
                log('✗ Error processing ' + strikeId + ': ' + e.message);
                resolve();
              }
            };

            video.onerror = (err) => {
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

server.listen(8999, () => {
  console.log('Extractor server started on http://localhost:8999');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  exec(`"${edgePath}" --headless --disable-gpu http://localhost:8999`, (err) => {
    if (err) {
      console.error('Edge execution error:', err.message);
    }
  });
});
