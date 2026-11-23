// Icon Studio MCP server: tool definitions shared by the stdio and HTTP entry points.
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { composeSvg, canonicalSvg, DEFAULT_SETTINGS } from '../../src/lib/compose.ts';
import { buildIndex, search } from '../../src/lib/search.ts';

const here = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_BASE = (process.env.ICON_STUDIO_PUBLIC_URL || 'https://psv98.github.io/gen/').replace(/\/?$/, '/');

let resvg = null;
try {
  resvg = (await import('@resvg/resvg-js')).Resvg;
} catch {
  /* PNG output is optional */
}

/** Loads the catalogue from a URL (ICON_STUDIO_REGISTRY_URL) or from the repository. */
export async function loadRegistry() {
  const url = process.env.ICON_STUDIO_REGISTRY_URL;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cannot load registry from ${url}: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(fs.readFileSync(path.resolve(here, '../../src/data/registry.json'), 'utf8'));
}

const styleShape = {
  color: z.string().optional().describe('Stroke colour: #RRGGBB or "currentColor". Default #111111.'),
  stroke_width: z.number().min(0.75).max(3.5).optional().describe('Stroke width in the 24-unit grid (0.75–3.5). Default 1.8.'),
  size: z.number().int().min(12).max(4096).optional().describe('Output size in px (square canvas). Default 24.'),
  background: z.string().optional().describe('Background colour #RRGGBB. Omit for transparent.'),
  background_shape: z.enum(['square', 'rounded', 'circle', 'squircle']).optional().describe('Background shape. Default rounded.'),
  padding: z.number().min(0).max(0.4).optional().describe('Padding as a share of the size when a background is set (0–0.4). Default 0.2.'),
};

function styled(body, a) {
  const size = a.size ?? 24;
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const pad = a.background ? Math.round(size * (a.padding ?? 0.2)) : 0;
  s.canvas = { ...s.canvas, width: size, height: size, iconSize: size - pad * 2, padding: pad, lockRatio: true };
  s.stroke = { ...s.stroke, color: a.color && a.color !== 'currentColor' ? a.color : '#111111', width: a.stroke_width ?? 1.8 };
  if (a.background) s.background = { ...s.background, type: 'solid', color: a.background, shape: a.background_shape ?? 'rounded', radius: 22 };
  return composeSvg(body, s, { idPrefix: 'ic', useCurrentColor: a.color === 'currentColor' });
}

function summary(i, categories) {
  const cat = categories.find((c) => c.id === i.c);
  return {
    id: i.id,
    slug: i.slug,
    name: { ru: i.n[0], uk: i.n[1], en: i.n[2] },
    category: i.c,
    category_name: cat?.names?.en,
    description: i.d,
    keywords: i.k,
    safe_stroke_max: i.s[1],
    svg_url: `${PUBLIC_BASE}icons/${i.c}/${i.slug}.svg`,
  };
}

export async function createServer() {
  const reg = await loadRegistry();
  const { categories, icons } = reg;
  const index = buildIndex(icons, categories);
  const find = (ref) => {
    const r = String(ref).trim().toLowerCase();
    return icons.find((i) => i.id.toLowerCase() === r || i.slug === r);
  };

  const server = new McpServer({ name: 'icon-studio', version: '1.0.0' }, {
    instructions:
      'Icon Studio is a library of 500 original stroke icons (24×24 grid, 1.8 stroke) in 10 categories: legal, media, technology, healthcare, finance, documents, government, ngo, security, business. ' +
      'Use search_icons (Russian, Ukrainian or English queries) to find icons, then get_icon or get_icons to receive ready SVG markup styled for the design (colour, stroke, size, background). ' +
      'Embed the returned SVG directly in slides, documents or HTML. Keep stroke_width within safe_stroke_max for crisp results.',
  });

  server.registerTool('list_categories', {
    title: 'List icon categories',
    description: 'Lists the icon categories with names in three languages and icon counts.',
    annotations: { readOnlyHint: true },
  }, async () => {
    const out = categories.map((c) => ({ id: c.id, names: c.names, count: icons.filter((i) => i.c === c.id).length }));
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: { categories: out } };
  });

  server.registerTool('search_icons', {
    title: 'Search icons',
    description: 'Finds icons by meaning. Accepts Russian, Ukrainian or English words, an ID (LAW-001) or a slug. Returns IDs, names, keywords and public SVG links.',
    inputSchema: {
      query: z.string().describe('What the icon should show, e.g. "суд", "court", "grant", "privacy".'),
      category: z.string().optional().describe('Optional category id, e.g. legal, finance.'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results, default 20.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ query, category, limit }) => {
    let found = search(index, query);
    if (category) found = found.filter((i) => i.c === category);
    const out = found.slice(0, limit ?? 20).map((i) => summary(i, categories));
    const text = out.length ? out.map((o) => `${o.id} ${o.slug} — ${o.name.en} / ${o.name.ru} (${o.category})`).join('\n') : `No icons match "${query}". Try a synonym or another language.`;
    return { content: [{ type: 'text', text }], structuredContent: { results: out } };
  });

  server.registerTool('get_icon', {
    title: 'Get icon SVG',
    description: 'Returns one icon as SVG markup with the requested colour, stroke width, size and optional background. With format "png" also returns a PNG image.',
    inputSchema: {
      icon: z.string().describe('Icon id (LAW-001) or slug (scales-of-justice).'),
      format: z.enum(['svg', 'png', 'original']).optional().describe('svg (default), png (rendered image) or original (canonical 24×24 file with currentColor).'),
      ...styleShape,
    },
    annotations: { readOnlyHint: true },
  }, async (a) => {
    const i = find(a.icon);
    if (!i) return { isError: true, content: [{ type: 'text', text: `Icon "${a.icon}" not found. Use search_icons first.` }] };
    if (a.format === 'original') return { content: [{ type: 'text', text: canonicalSvg(i.b) }] };
    const svg = styled(i.b, a);
    const content = [{ type: 'text', text: svg }];
    if (a.format === 'png') {
      if (!resvg) return { isError: true, content: [{ type: 'text', text: 'PNG rendering is unavailable on this server (install @resvg/resvg-js). SVG:\n' + svg }] };
      const png = new resvg(svg.replace('currentColor', '#111111')).render().asPng();
      content.push({ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' });
    }
    return { content, structuredContent: { icon: summary(i, categories), svg } };
  });

  server.registerTool('get_icons', {
    title: 'Get several icons',
    description: 'Returns SVG markup for several icons at once with one shared style — handy for a consistent set on slides.',
    inputSchema: {
      icons: z.array(z.string()).min(1).max(50).describe('Icon ids or slugs.'),
      ...styleShape,
    },
    annotations: { readOnlyHint: true },
  }, async (a) => {
    const out = [];
    const missing = [];
    for (const ref of a.icons) {
      const i = find(ref);
      if (i) out.push({ id: i.id, slug: i.slug, name: i.n[2], svg: styled(i.b, a) });
      else missing.push(ref);
    }
    const text = out.map((o) => `<!-- ${o.id} ${o.slug} -->\n${o.svg}`).join('\n\n') + (missing.length ? `\n\nNot found: ${missing.join(', ')}` : '');
    return { content: [{ type: 'text', text }], structuredContent: { icons: out, missing } };
  });

  server.registerTool('build_sprite', {
    title: 'Build SVG sprite',
    description: 'Builds one SVG sprite with a <symbol> per icon (id = slug) for web pages: <svg><use href="#slug"/></svg>.',
    inputSchema: {
      icons: z.array(z.string()).min(1).max(200),
      color: z.string().optional().describe('#RRGGBB or currentColor (default).'),
      stroke_width: z.number().min(0.75).max(3.5).optional(),
    },
    annotations: { readOnlyHint: true },
  }, async (a) => {
    const color = a.color ?? 'currentColor';
    const sw = a.stroke_width ?? 1.8;
    const list = a.icons.map(find).filter(Boolean);
    const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${list
      .map((i) => `  <symbol id="${i.slug}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${i.b}</symbol>`)
      .join('\n')}\n</svg>`;
    return { content: [{ type: 'text', text: sprite }] };
  });

  return server;
}
