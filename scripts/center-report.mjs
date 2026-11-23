// Lists icons whose geometry bbox is off-centre in the 24 grid.
import fs from 'node:fs';
import { sampleBody, bbox } from './lib/geometry.mjs';
const reg = JSON.parse(fs.readFileSync('src/data/registry.json', 'utf8'));
const lim = parseFloat(process.argv[2] || '0.75');
for (const i of reg.icons) {
  const b = bbox(sampleBody(i.b));
  const dx = 12 - (b.x0 + b.x1) / 2, dy = 12 - (b.y0 + b.y1) / 2;
  if (Math.abs(dx) > lim || Math.abs(dy) > lim) console.log(`${i.c}\t${i.slug}\tdx=${dx.toFixed(2)} dy=${dy.toFixed(2)}\tw=${(b.x1 - b.x0).toFixed(1)} h=${(b.y1 - b.y0).toFixed(1)}`);
}
