// Authoring tool: turns icons-src/<category>.mjs into
//   public/icons/<category>/<slug>.svg  (one standalone file per icon)
//   src/data/icons-manifest.json         (metadata for all concepts)
// Entry format: [slug, 'ru|uk|en names', 'description', 'kw ru|kw uk|kw en', 'tags', body]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { categories, ROOT_ATTRS } from '../icons-src/categories.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = { version: 1, generatedAt: null, categories: [], icons: [] };
let total = 0;

for (const cat of categories) {
  const src = path.join(root, 'icons-src', `${cat.id}.mjs`);
  const outDir = path.join(root, 'public', 'icons', cat.id);
  fs.mkdirSync(outDir, { recursive: true });
  manifest.categories.push({ id: cat.id, prefix: cat.prefix, names: cat.names });
  if (!fs.existsSync(src)) continue;
  const entries = (await import(pathToFileURL(src).href + '?t=' + Date.now())).default;
  const keep = new Set();
  entries.forEach((e, i) => {
    const [slug, names, description, keywords, tags, body] = e;
    if (!slug || !body) throw new Error(`${cat.id}#${i + 1}: malformed entry`);
    const [ru, uk, en] = names.split('|').map((s) => s.trim());
    const [kru = '', kuk = '', ken = ''] = keywords.split('|');
    const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const id = `${cat.prefix}-${String(i + 1).padStart(3, '0')}`;
    manifest.icons.push({
      id, slug, category: cat.id, name: ru, names: { ru, uk, en }, description,
      keywords: { ru: split(kru), uk: split(kuk), en: split(ken) }, tags: split(tags),
      file: `icons/${cat.id}/${slug}.svg`,
    });
    const svg = `<svg ${ROOT_ATTRS}>\n  ${body.trim().replace(/>\s*</g, '>\n  <')}\n</svg>\n`;
    fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);
    keep.add(`${slug}.svg`);
    total++;
  });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.svg') && !keep.has(f)) fs.unlinkSync(path.join(outDir, f));
}
manifest.generatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(root, 'src/data/icons-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`emitted ${total} icons`);
