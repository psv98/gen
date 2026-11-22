// validate-icons — technical QA for the whole library.
// Usage: npm run validate-icons [-- --no-raster]
// Writes src/data/qa-report.json (shown in the Icon Quality Gallery) and exits 1 on errors.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { sampleBody, bbox, strokeRange, normalizeBody, parseElements } from './lib/geometry.mjs';
import { categories } from '../icons-src/categories.mjs';
import { composeSvg, DEFAULT_SETTINGS } from '../src/lib/compose.ts';

const root = path.resolve(import.meta.dirname, '..');
const EXPECTED_TOTAL = 500;
const PER_CATEGORY = 50;
const noRaster = process.argv.includes('--no-raster');

const { window } = new JSDOM('');
const parser = new window.DOMParser();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/icons-manifest.json'), 'utf8'));

const checks = [];
const iconIssues = {};
const note = (id, msg) => ((iconIssues[id] ??= []).push(msg));
function check(id, name, fn) {
  const problems = [];
  const warnings = [];
  fn(problems, warnings);
  checks.push({ id, name, ok: problems.length === 0, problems, warnings });
}

// Collect files on disk
const files = [];
const iconsDir = path.join(root, 'public/icons');
for (const dir of fs.readdirSync(iconsDir)) {
  const full = path.join(iconsDir, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) if (f.endsWith('.svg')) files.push({ cat: dir, file: `icons/${dir}/${f}`, abs: path.join(full, f) });
}
const byFile = new Map(manifest.icons.map((i) => [i.file, i]));
const svgText = new Map(files.map((f) => [f.file, fs.readFileSync(f.abs, 'utf8')]));
const inner = (svg) => (svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1] ?? '').replace(/\s*\n\s*/g, '').trim();
const rootTag = (svg) => svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
const label = (f) => `${f}${byFile.get(f) ? ` (${byFile.get(f).id})` : ''}`;

check(1, `Ровно ${EXPECTED_TOTAL} SVG-файлов`, (p) => {
  if (files.length !== EXPECTED_TOTAL) p.push(`найдено ${files.length}`);
});

check(2, `По ${PER_CATEGORY} иконок в каждой из ${categories.length} категорий`, (p) => {
  const ids = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    const n = files.filter((f) => f.cat === c.id).length;
    if (n !== PER_CATEGORY) p.push(`${c.id}: ${n}`);
  }
  for (const f of files) if (!ids.has(f.cat)) p.push(`неизвестная папка категории: ${f.cat}`);
});

check(3, 'Уникальность ID', (p) => {
  const seen = new Map();
  for (const i of manifest.icons) {
    if (seen.has(i.id)) p.push(`${i.id}: ${seen.get(i.id)} и ${i.file}`);
    seen.set(i.id, i.file);
    if (!/^[A-Z]{3}-\d{3}$/.test(i.id)) p.push(`некорректный формат ID ${i.id}`);
  }
});

check(4, 'Уникальность slug', (p) => {
  const seen = new Map();
  for (const i of manifest.icons) {
    if (seen.has(i.slug)) p.push(`${i.slug}: ${seen.get(i.slug)} и ${i.id}`);
    seen.set(i.slug, i.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug)) p.push(`некорректный slug ${i.slug}`);
  }
});

check(5, 'Соответствие файлов реестру', (p) => {
  for (const i of manifest.icons) {
    if (!svgText.has(i.file)) p.push(`нет файла для ${i.id}: ${i.file}`);
    if (i.file !== `icons/${i.category}/${i.slug}.svg`) p.push(`путь не совпадает с категорией/slug: ${i.file}`);
    for (const k of ['ru', 'uk', 'en']) if (!i.names?.[k]) p.push(`${i.id}: нет названия ${k}`);
    if (!i.description) p.push(`${i.id}: нет описания`);
    if (!i.tags?.length) p.push(`${i.id}: нет тегов`);
    for (const k of ['ru', 'uk', 'en']) if (!i.keywords?.[k]?.length) p.push(`${i.id}: нет ключевых слов ${k}`);
  }
  for (const f of files) if (!byFile.has(f.file)) p.push(`файл без записи в реестре: ${f.file}`);
});

check(6, 'Валидная SVG-разметка', (p) => {
  for (const [f, svg] of svgText) {
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    if (err) { p.push(`${label(f)}: ${err.textContent.trim().slice(0, 80)}`); note(byFile.get(f)?.id, 'XML parse error'); continue; }
    const el = doc.documentElement;
    if (el.nodeName !== 'svg' || el.getAttribute('xmlns') !== 'http://www.w3.org/2000/svg') p.push(`${label(f)}: корневой элемент не <svg xmlns>`);
  }
});

check(7, 'Корректный viewBox 0 0 24 24', (p) => {
  for (const [f, svg] of svgText) {
    const r = rootTag(svg);
    if (!/viewBox="0 0 24 24"/.test(r)) p.push(`${label(f)}: viewBox`);
    if (!/width="24"/.test(r) || !/height="24"/.test(r)) p.push(`${label(f)}: width/height ≠ 24`);
  }
});

check(8, 'Нет внешних ссылок', (p) => {
  for (const [f, svg] of svgText) if (/(href\s*=|xlink:|url\(|https?:\/\/(?!www\.w3\.org\/2000\/svg)|@import)/i.test(svg)) { p.push(label(f)); note(byFile.get(f)?.id, 'external reference'); }
});

check(9, 'Нет скриптов и опасных конструкций', (p) => {
  const bad = /<(script|foreignObject|iframe|object|embed|style|image|use|animate|set)\b|\son[a-z]+\s*=|javascript:|data:/i;
  for (const [f, svg] of svgText) if (bad.test(svg)) { p.push(label(f)); note(byFile.get(f)?.id, 'unsafe markup'); }
});

const geo = new Map();
check(10, 'Нет пустых иконок', (p) => {
  for (const [f, svg] of svgText) {
    const body = inner(svg);
    const comps = sampleBody(body);
    const len = comps.reduce((a, c) => a + c.length, 0);
    geo.set(f, { body, comps });
    if (!comps.length || len < 6) p.push(`${label(f)}: длина геометрии ${len.toFixed(1)}`);
    if (comps.some((c) => c.unsupported)) p.push(`${label(f)}: неподдерживаемый элемент`);
  }
});

check(11, 'Нет точных геометрических дубликатов', (p) => {
  const seen = new Map();
  for (const [f, { body }] of geo) {
    const hash = crypto.createHash('sha1').update(normalizeBody(body)).digest('hex');
    if (seen.has(hash)) p.push(`${label(f)} = ${label(seen.get(hash))}`);
    else seen.set(hash, f);
  }
});

check(12, 'Цвет меняется через currentColor', (p) => {
  for (const [f, svg] of svgText) {
    const r = rootTag(svg);
    if (!/stroke="currentColor"/.test(r) || !/fill="none"/.test(r)) p.push(`${label(f)}: корень без stroke=currentColor/fill=none`);
    for (const { tag, attrs } of parseElements(geo.get(f).body))
      for (const a of ['fill', 'stroke', 'color', 'style', 'opacity', 'stroke-opacity', 'fill-opacity']) if (a in attrs) p.push(`${label(f)}: <${tag}> задаёт ${a}`);
  }
});

check(13, 'stroke-width задаётся только глобально', (p) => {
  for (const [f, svg] of svgText) {
    const r = rootTag(svg);
    if (!/stroke-width="1\.8"/.test(r) || !/stroke-linecap="round"/.test(r) || !/stroke-linejoin="round"/.test(r)) p.push(`${label(f)}: корневые параметры обводки`);
    for (const { tag, attrs } of parseElements(geo.get(f).body)) {
      for (const a of ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'vector-effect', 'stroke-dasharray']) if (a in attrs) p.push(`${label(f)}: <${tag}> задаёт ${a}`);
      // A scale in a child transform would distort the stroke relative to the global width.
      if (attrs.transform && /scale|matrix|skew/.test(attrs.transform)) p.push(`${label(f)}: <${tag}> transform искажает толщину (${attrs.transform})`);
    }
  }
});

const ranges = {};
check(14, 'Геометрия в пределах области (ошибка вне 1–23, предупреждение вне 2–22)', (p, w) => {
  for (const [f, { comps }] of geo) {
    const b = bbox(comps);
    const id = byFile.get(f)?.id;
    const r = strokeRange(comps);
    ranges[id] = r;
    if (b.x0 < 1 || b.y0 < 1 || b.x1 > 23 || b.y1 > 23) { p.push(`${label(f)}: bbox ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(2)).join(' ')}`); note(id, 'выходит за область'); }
    else if (b.x0 < 1.95 || b.y0 < 1.95 || b.x1 > 22.05 || b.y1 > 22.05) { w.push(`${label(f)}: заходит в поле 1–2 (bbox ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1)).join(' ')})`); }
    if (r.range[1] < 2.4) { w.push(`${label(f)}: близкие элементы (зазор ${r.gap}), безопасный максимум ${r.range[1]}`); note(id, `безопасная толщина до ${r.range[1]}`); }
  }
});

check(15, 'Экспорт: сборка SVG с фоном, тенью и растеризация', (p, w) => {
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  s.background.type = 'linear';
  s.background.shape = 'squircle';
  s.shadow.enabled = true;
  s.canvas.rotation = 15;
  const composed = [];
  for (const [f, { body }] of geo) {
    const id = byFile.get(f)?.id ?? 'x';
    const out = composeSvg(body, s, { idPrefix: id, outWidth: 256, outHeight: 256, title: id });
    const doc = parser.parseFromString(out, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length) p.push(`${label(f)}: собранный SVG невалиден`);
    composed.push(out);
  }
  if (noRaster) { w.push('растеризация пропущена (--no-raster)'); return; }
  try {
    const cols = 25;
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * 64}" height="${Math.ceil(composed.length / cols) * 64}">${composed
      .map((c, i) => c.replace('<svg ', `<svg x="${(i % cols) * 64}" y="${Math.floor(i / cols) * 64}" `).replace(/width="256" height="256"/, 'width="64" height="64"'))
      .join('')}</svg>`;
    const tmp = path.join(root, 'qa-sheets');
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'export-check.svg'), sheet);
    execFileSync('rsvg-convert', ['-o', path.join(tmp, 'export-check.png'), path.join(tmp, 'export-check.svg')], { stdio: 'pipe' });
  } catch (e) {
    if (e.code === 'ENOENT') w.push('rsvg-convert не найден — растеризация не проверялась');
    else p.push(`растеризация не удалась: ${String(e.message).slice(0, 120)}`);
  }
});

// Report
let errors = 0, warnings = 0;
for (const c of checks) {
  errors += c.problems.length;
  warnings += c.warnings.length;
  console.log(`${c.ok ? '✔' : '✘'} ${String(c.id).padStart(2)}. ${c.name}${c.problems.length ? ` — ${c.problems.length} проблем` : ''}${c.warnings.length ? ` (${c.warnings.length} предупр.)` : ''}`);
  for (const pr of c.problems.slice(0, 25)) console.log(`     ✘ ${pr}`);
  if (c.problems.length > 25) console.log(`     … и ещё ${c.problems.length - 25}`);
  for (const wr of c.warnings.slice(0, 40)) console.log(`     ⚠ ${wr}`);
  if (c.warnings.length > 40) console.log(`     … и ещё ${c.warnings.length - 40}`);
}
const maxes = Object.values(ranges).map((r) => r.range[1]);
const dist = { '3.5': maxes.filter((m) => m >= 3.5).length, '3.0–3.5': maxes.filter((m) => m >= 3 && m < 3.5).length, '2.4–3.0': maxes.filter((m) => m >= 2.4 && m < 3).length, '<2.4': maxes.filter((m) => m < 2.4).length };
console.log(`\nБезопасный максимум толщины (эвристика зазоров): ${JSON.stringify(dist)}`);
console.log(`Итого: ошибок ${errors}, предупреждений ${warnings}, иконок ${files.length}`);

const report = {
  generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  summary: { errors, warnings, icons: files.length },
  strokeMaxDistribution: dist,
  checks: checks.map(({ id, name, ok, problems, warnings: w }) => ({ id, name, ok, problems: problems.slice(0, 50), warnings: w.length })),
  icons: Object.fromEntries(Object.entries(iconIssues).filter(([k]) => k && k !== 'undefined')),
};
fs.writeFileSync(path.join(root, 'src/data/qa-report.json'), JSON.stringify(report, null, 1) + '\n');
process.exitCode = errors ? 1 : 0;
