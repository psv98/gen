// Builds src/data/registry.json from the manifest and the SVG files on disk.
// The SVG files are the source of truth for geometry; the manifest for metadata.
import fs from 'node:fs';
import path from 'node:path';
import { sampleBody, strokeRange } from './lib/geometry.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/icons-manifest.json'), 'utf8'));

export function innerBody(svg) {
  const m = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/);
  return m ? m[1].replace(/\s*\n\s*/g, '').trim() : '';
}

const icons = [];
const problems = [];
for (const ic of manifest.icons) {
  const file = path.join(root, 'public', ic.file);
  if (!fs.existsSync(file)) { problems.push(`missing file ${ic.file}`); continue; }
  const body = innerBody(fs.readFileSync(file, 'utf8'));
  const sr = strokeRange(sampleBody(body));
  icons.push({
    id: ic.id, slug: ic.slug, c: ic.category, n: [ic.names.ru, ic.names.uk, ic.names.en], d: ic.description,
    k: [...ic.keywords.ru, ...ic.keywords.uk, ...ic.keywords.en], t: ic.tags, s: sr.range, b: body,
  });
}
const out = { categories: manifest.categories.map(({ id, names }) => ({ id, names })), icons };
fs.writeFileSync(path.join(root, 'src/data/registry.json'), JSON.stringify(out));
// Public copy for remote tools (MCP server, scripts) served by GitHub Pages at /api/registry.json
fs.mkdirSync(path.join(root, 'public/api'), { recursive: true });
fs.writeFileSync(path.join(root, 'public/api/registry.json'), JSON.stringify(out));
console.log(`registry: ${icons.length} icons` + (problems.length ? `\n  ${problems.join('\n  ')}` : ''));
if (problems.length) process.exitCode = 1;
