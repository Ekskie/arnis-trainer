const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'arnis_dataset_v2.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
const header = lines[0].split(',').map(h => h.trim());

const idx = {
  strike: header.indexOf('Strike_Type'),
  vid: header.indexOf('Video_Name'),
  frame: header.indexOf('Frame_ID'),
  dist: header.indexOf('Dist_R_Wrist_Shoulder'),
  r_elb: header.indexOf('R_Elbow_Angle'),
  l_elb: header.indexOf('L_Elbow_Angle'),
  r_shld: header.indexOf('R_Shoulder_Angle'),
  r_knee: header.indexOf('R_Knee_Angle'),
};

const map = {};
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split(',').map(c => c.trim());
  if (!row[idx.strike]) continue;
  const s = row[idx.strike];
  const v = row[idx.vid];
  const fStr = row[idx.frame] ? row[idx.frame].replace('.jpg', '') : '';
  const f = parseInt(fStr);
  const d = parseFloat(row[idx.dist]);
  if (!map[s]) map[s] = {};
  if (!map[s][v]) map[s][v] = [];
  if (!isNaN(f) && !isNaN(d)) {
    map[s][v].push({
      f, d,
      r_elb: parseFloat(row[idx.r_elb]) || 140,
      l_elb: parseFloat(row[idx.l_elb]) || 75,
      r_shld: parseFloat(row[idx.r_shld]) || 60,
      r_knee: parseFloat(row[idx.r_knee]) || 165
    });
  }
}

const out = {};
for (let i = 1; i <= 12; i++) {
  const s = 'strike_' + i;
  const vids = map[s] || {};
  const bestVid = Object.keys(vids).sort((a,b) => vids[b].length - vids[a].length)[0];
  const frames = vids[bestVid] || [];
  frames.sort((a,b) => b.d - a.d);
  const apex = frames[0] || { f: 45, r_elb: 140, l_elb: 75, r_shld: 60, r_knee: 165 };
  out[s] = {
    impactFrame: apex.f,
    impactTime: parseFloat((apex.f / 30).toFixed(2)),
    elbow: parseFloat(apex.r_elb.toFixed(1)),
    shoulder: parseFloat(apex.r_shld.toFixed(1)),
    knee: parseFloat(apex.r_knee.toFixed(1)),
    guard: parseFloat(apex.l_elb.toFixed(1)),
  };
}

console.log(JSON.stringify(out, null, 2));
