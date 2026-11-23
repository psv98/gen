// Renders contact sheets (PNG) for visual QA: node scripts/render-sheets.mjs [category] [--stroke=1.8]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'src/data/registry.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const mode = (args.find((a) => a.startsWith('--mode=')) || '--mode=main').slice(7);
const outDir = path.join(root, 'qa-sheets');
const pick = (args.find((a) => a.startsWith('--slugs=')) || '').slice(8).split(',').filter(Boolean);
if (pick.length) {
  const list = pick.map((sl) => reg.icons.find((i) => i.slug === sl)).filter(Boolean);
  reg.categories = [{ id: 'picked' }];
  for (const i of list) i.c = 'picked';
  reg.icons = list;
}
fs.mkdirSync(outDir, { recursive: true });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
for (const cat of reg.categories) {
  if (only && cat.id !== only) continue;
  const list = reg.icons.filter((i) => i.c === cat.id);
  if (!list.length) continue;
  const big = mode === 'big';
  const cols = big ? 8 : 10, cw = big ? 150 : 120, ch = big ? 132 : mode === 'main' ? 118 : 120;
  const rows = Math.ceil(list.length / cols);
  let g = '';
  list.forEach((ic, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    const icon = (sx, sy, size, sw) => `<g transform="translate(${sx} ${sy}) scale(${size / 24})" fill="none" stroke="#111" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ic.b}</g>`;
    if (big) {
      g += `<rect x="${x + 4}" y="${y + 4}" width="${cw - 8}" height="${ch - 8}" rx="8" fill="#f4f4f6"/>`;
      // 24-grid guide behind the 72px render: safe zone 2–22
      g += `<rect x="${x + 12 + 6}" y="${y + 12 + 6}" width="60" height="60" fill="none" stroke="#dcdce4" stroke-dasharray="2 2"/>`;
      g += `<path d="M${x + 48} ${y + 12}v72M${x + 12} ${y + 48}h72" stroke="#e4e4ec"/>`;
      g += icon(x + 12, y + 12, 72, 1.8);
      g += icon(x + 100, y + 20, 24, 1.8) + icon(x + 104, y + 56, 16, 1.8);
      g += `<text x="${x + 75}" y="${y + 104}" font-size="10" font-family="sans-serif" text-anchor="middle" fill="#333">${i + 1}. ${esc(ic.n[2].slice(0, 20))}</text>`;
      g += `<text x="${x + 75}" y="${y + 118}" font-size="8" font-family="monospace" text-anchor="middle" fill="#999">${ic.slug.slice(0, 24)}</text>`;
    } else if (mode === 'main') {
      g += `<rect x="${x + 4}" y="${y + 4}" width="${cw - 8}" height="${ch - 8}" rx="8" fill="#f4f4f6"/>`;
      g += icon(x + 36, y + 12, 48, 1.8);
      g += icon(x + 10, y + 70, 16, 1.8) + icon(x + 32, y + 66, 24, 1.8);
      g += `<text x="${x + 60}" y="${y + 105}" font-size="9" font-family="sans-serif" text-anchor="middle" fill="#444">${esc(ic.n[2].slice(0, 22))}</text>`;
      g += `<text x="${x + 112}" y="${y + 82}" font-size="8" font-family="monospace" text-anchor="end" fill="#999">${i + 1}</text>`;
    } else {
      g += `<rect x="${x + 4}" y="${y + 4}" width="${cw - 8}" height="${ch - 8}" rx="8" fill="#f4f4f6"/>`;
      g += icon(x + 8, y + 10, 48, 0.75) + icon(x + 64, y + 10, 48, Math.min(3.5, ic.s[1]));
      g += icon(x + 8, y + 64, 48, 3.5);
      g += `<text x="${x + 88}" y="${y + 95}" font-size="9" font-family="monospace" text-anchor="middle" fill="#444">${i + 1} ≤${ic.s[1]}</text>`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * ch}"><rect width="100%" height="100%" fill="#fff"/>${g}</svg>`;
  const f = path.join(outDir, `${cat.id}-${mode}`);
  fs.writeFileSync(f + '.svg', svg);
  execFileSync('rsvg-convert', ['-o', f + '.png', f + '.svg']);
  console.log(f + '.png');
}
