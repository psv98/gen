// Imports SVG icons drawn outside the project (e.g. by another model) into icons-src.
//
//   node scripts/import-icons.mjs <folder-or-zip> --category legal [--manifest manifest.json] [--dry]
//
// Every SVG is normalised to the library format, checked, and reported:
//   ✔ accepted  — appended to icons-src/<category>.mjs (unless --dry)
//   ✘ rejected  — with the reason (wrong viewBox, fills, raster images, scale transforms,
//                 geometry outside the 24 grid, duplicate geometry or slug…)
// Metadata comes from manifest.json ([{ slug, ru, uk, en, description, keywords: {ru,uk,en}, tags }])
// when present; otherwise names are derived from the file name and must be completed by hand.
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { sampleBody, bbox, normalizeBody, parseElements, strokeRange } from './lib/geometry.mjs';
import { categories } from '../icons-src/categories.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith('--'));
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const category = opt('category');
const dry = args.includes('--dry');
if (!src || !categories.some((c) => c.id === category)) {
  console.error(`Usage: node scripts/import-icons.mjs <folder|zip> --category <${categories.map((c) => c.id).join('|')}> [--manifest file.json] [--dry]`);
  process.exit(1);
}

async function readInput(p) {
  const files = [];
  let manifest = null;
  if (p.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(fs.readFileSync(p));
    for (const [name, f] of Object.entries(zip.files)) {
      if (f.dir) continue;
      if (name.endsWith('.svg')) files.push({ name: path.basename(name), text: await f.async('string') });
      if (/manifest\.json$/i.test(name)) manifest = JSON.parse(await f.async('string'));
    }
  } else {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.svg')) files.push({ name: e.name, text: fs.readFileSync(full, 'utf8') });
      else if (/manifest\.json$/i.test(e.name)) manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
    });
    walk(p);
  }
  const m = opt('manifest');
  if (m) manifest = JSON.parse(fs.readFileSync(m, 'utf8'));
  return { files, manifest };
}

const STRIP = /\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-miterlimit|class|style|id|data-[\w-]+)="[^"]*"/g;

function normalise(text) {
  const problems = [];
  const rootTag = text.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const vb = rootTag.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.join(' ') !== '0 0 24 24') problems.push(`viewBox ${vb ? vb.join(' ') : 'отсутствует'} (нужен 0 0 24 24)`);
  if (/<(image|script|foreignObject|style|use|text|linearGradient|radialGradient|filter|mask|clipPath)\b/i.test(text)) problems.push('недопустимые элементы (image/script/text/градиенты/фильтры/маски)');
  if (/fill="(?!none)[^"]+"/.test(text.replace(/<svg\b[^>]*>/, ''))) problems.push('заливка у элементов — нужны только обводки');
  let body = (text.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?g\b[^>]*>/g, '')
    .replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '')
    .replace(STRIP, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  for (const { tag, attrs } of parseElements(body)) {
    if (!['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'].includes(tag)) problems.push(`элемент <${tag}>`);
    if (attrs.transform && /scale|matrix|skew/.test(attrs.transform)) problems.push(`<${tag}> с масштабирующим transform`);
  }
  if (/<g\b[^>]*transform/.test(text)) problems.push('transform на группе <g> (раскройте группы)');
  return { body, problems };
}

const { files, manifest } = await readInput(src);
const meta = new Map((manifest ?? []).map((m) => [m.slug, m]));
const srcFile = path.join(root, 'icons-src', `${category}.mjs`);
const existingText = fs.existsSync(srcFile) ? fs.readFileSync(srcFile, 'utf8') : 'export default [\n];\n';
const reg = JSON.parse(fs.readFileSync(path.join(root, 'src/data/registry.json'), 'utf8'));
const slugs = new Set(reg.icons.map((i) => i.slug));
const bodies = new Set(reg.icons.map((i) => normalizeBody(i.b)));
const accepted = [];
let rejected = 0;

for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
  const slug = f.name.replace(/\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { body, problems } = normalise(f.text);
  if (body) {
    const comps = sampleBody(body);
    const b = bbox(comps);
    if (!comps.length) problems.push('пустая геометрия');
    else if (b.x0 < 1 || b.y0 < 1 || b.x1 > 23 || b.y1 > 23) problems.push(`геометрия выходит за 1–23 (${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1)).join(' ')})`);
    const r = strokeRange(comps);
    if (r.gap !== null && r.gap < 2.2) problems.push(`слишком тесные элементы: зазор ${r.gap}, линии сольются уже при ${r.range[1]}`);
  } else problems.push('нет геометрии');
  if (slugs.has(slug)) problems.push(`slug «${slug}» уже есть в библиотеке`);
  if (bodies.has(normalizeBody(body))) problems.push('геометрия совпадает с существующей иконкой');
  if (problems.length) { rejected++; console.log(`✘ ${f.name}: ${problems.join('; ')}`); continue; }
  slugs.add(slug);
  bodies.add(normalizeBody(body));
  const m = meta.get(slug) ?? {};
  const words = slug.replace(/-/g, ' ');
  const kw = m.keywords ?? {};
  const names = `${m.ru ?? 'TODO ' + words}|${m.uk ?? 'TODO ' + words}|${m.en ?? words}`;
  const keywords = `${(kw.ru ?? []).join(',')}|${(kw.uk ?? []).join(',')}|${(kw.en ?? [words]).join(',')}`;
  accepted.push(`[${JSON.stringify(slug)}, ${JSON.stringify(names)}, ${JSON.stringify(m.description ?? 'TODO описание')}, ${JSON.stringify(keywords)}, ${JSON.stringify((m.tags ?? ['imported']).join(','))},\n ${JSON.stringify(body)}],`);
  console.log(`✔ ${f.name}`);
}

console.log(`\nПринято ${accepted.length}, отклонено ${rejected} из ${files.length}.`);
if (accepted.length && !dry) {
  const out = existingText.replace(/\n\];\s*$/, `\n// imported ${new Date().toISOString().slice(0, 10)} from ${path.basename(src)}\n${accepted.join('\n')}\n];\n`);
  fs.writeFileSync(srcFile, out);
  console.log(`Добавлено в ${path.relative(root, srcFile)}. Дальше: заполнить TODO, npm run icons, npm run sheets ${category}, npm run validate-icons.`);
}
