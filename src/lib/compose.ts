// Single source of truth for rendering: the canvas preview, thumbnails in the
// preview strip, SVG export and raster export all go through composeSvg().
import type { StudioSettings, BgShape } from '../types/index.ts';

export const BASE_STROKE = 1.8;
export const STROKE_LIMITS: [number, number] = [0.75, 3.5];

export const DEFAULT_SETTINGS: StudioSettings = {
  stroke: { width: BASE_STROKE, color: '#18181B', linecap: 'round', linejoin: 'round' },
  background: { type: 'none', color: '#F4F1FF', color2: '#C9BCFF', angle: 135, shape: 'rounded', radius: 22 },
  canvas: { width: 512, height: 512, lockRatio: true, iconSize: 320, padding: 48, alignX: 'center', alignY: 'center', rotation: 0, flipX: false, flipY: false },
  shadow: { enabled: false, color: '#000000', blur: 12, opacity: 0.25, x: 0, y: 8 },
};

export function cloneSettings(s: StudioSettings): StudioSettings {
  return JSON.parse(JSON.stringify(s));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Accepts #rgb / #rrggbb / #rrggbbaa; anything else falls back. */
export function safeColor(c: string, fallback = '#000000'): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c.trim()) ? c.trim() : c === 'currentColor' ? c : fallback;
}

/** Superellipse |x/a|^n + |y/b|^n = 1 as a smooth closed cubic path (Catmull-Rom → Bézier). */
export function squirclePath(w: number, h: number, n: number, x0 = 0, y0 = 0, segments = 64): string {
  const a = w / 2, b = h / 2, cx = x0 + a, cy = y0 + b;
  const pts: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < segments; i++) {
    const p0 = pts[(i - 1 + segments) % segments], p1 = pts[i], p2 = pts[(i + 1) % segments], p3 = pts[(i + 2) % segments];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + 'Z';
}

/** Maps the 0–50 corner control to a superellipse exponent (50 → near-ellipse, 0 → near-square). */
export function squircleExponent(radius: number): number {
  const k = 1 - Math.min(50, Math.max(0, radius)) / 50;
  return 2.5 + 17.5 * k * k;
}

export function shapeMarkup(shape: BgShape, w: number, h: number, radius: number, fill: string): string {
  const m = Math.min(w, h);
  if (shape === 'circle') return `<circle cx="${r2(w / 2)}" cy="${r2(h / 2)}" r="${r2(m / 2)}" fill="${fill}"/>`;
  if (shape === 'squircle') return `<path d="${squirclePath(w, h, squircleExponent(radius))}" fill="${fill}"/>`;
  const rx = shape === 'rounded' ? r2((Math.min(50, Math.max(0, radius)) / 100) * m) : 0;
  return `<rect width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"/>`;
}

/** Position of the icon box (top-left) inside the canvas. */
export function iconBox(s: StudioSettings) {
  const { width: W, height: H, iconSize: S, padding: P, alignX, alignY } = s.canvas;
  const pos = (total: number, a: string) => (a === 'start' ? P : a === 'end' ? total - P - S : (total - S) / 2);
  return { x: pos(W, alignX), y: pos(H, alignY), size: S };
}

/** Transform that maps the 24×24 icon grid into canvas space. */
export function iconTransform(s: StudioSettings): string {
  const { x, y, size } = iconBox(s);
  const k = size / 24;
  const fx = s.canvas.flipX ? -1 : 1, fy = s.canvas.flipY ? -1 : 1;
  const parts = [`translate(${r2(x + size / 2)} ${r2(y + size / 2)})`];
  if (s.canvas.rotation) parts.push(`rotate(${r2(s.canvas.rotation)})`);
  parts.push(`scale(${r2(k * fx * 1000) / 1000} ${r2(k * fy * 1000) / 1000})`, 'translate(-12 -12)');
  return parts.join(' ');
}

export interface ComposeOptions {
  /** Output pixel size; defaults to the canvas size. Geometry is scaled via viewBox. */
  outWidth?: number;
  outHeight?: number;
  /** Unique prefix for defs ids so several SVGs can live on one page. */
  idPrefix?: string;
  /** Write `currentColor` instead of the chosen stroke colour. */
  useCurrentColor?: boolean;
  /** Ignore background (used for "original" comparison and thumbnails). */
  noBackground?: boolean;
  title?: string;
}

export function composeSvg(body: string, s: StudioSettings, o: ComposeOptions = {}): string {
  const W = Math.max(1, s.canvas.width), H = Math.max(1, s.canvas.height);
  const ow = o.outWidth ?? W, oh = o.outHeight ?? H;
  const id = (o.idPrefix ?? 'is').replace(/[^a-zA-Z0-9_-]/g, '');
  const bg = s.background;
  let defs = '';
  let bgMarkup = '';
  if (!o.noBackground && bg.type !== 'none') {
    let fill = safeColor(bg.color);
    if (bg.type === 'linear') {
      const a = ((bg.angle - 90) * Math.PI) / 180;
      const dx = Math.cos(a), dy = Math.sin(a);
      const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
      defs += `<linearGradient id="${id}-bg" gradientUnits="userSpaceOnUse" x1="${r2(W / 2 - dx * half)}" y1="${r2(H / 2 - dy * half)}" x2="${r2(W / 2 + dx * half)}" y2="${r2(H / 2 + dy * half)}"><stop offset="0" stop-color="${safeColor(bg.color)}"/><stop offset="1" stop-color="${safeColor(bg.color2)}"/></linearGradient>`;
      fill = `url(#${id}-bg)`;
    } else if (bg.type === 'radial') {
      defs += `<radialGradient id="${id}-bg" gradientUnits="userSpaceOnUse" cx="${r2(W / 2)}" cy="${r2(H / 2)}" r="${r2(Math.hypot(W, H) / 2)}"><stop offset="0" stop-color="${safeColor(bg.color)}"/><stop offset="1" stop-color="${safeColor(bg.color2)}"/></radialGradient>`;
      fill = `url(#${id}-bg)`;
    }
    bgMarkup = shapeMarkup(bg.shape, W, H, bg.radius, fill);
  }
  const sh = s.shadow;
  let filterAttr = '';
  if (sh.enabled) {
    defs += `<filter id="${id}-shadow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feDropShadow dx="${r2(sh.x)}" dy="${r2(sh.y)}" stdDeviation="${r2(Math.max(0, sh.blur) / 2)}" flood-color="${safeColor(sh.color)}" flood-opacity="${r2(Math.min(1, Math.max(0, sh.opacity)))}"/></filter>`;
    filterAttr = ` filter="url(#${id}-shadow)"`;
  }
  const st = s.stroke;
  const color = o.useCurrentColor ? 'currentColor' : safeColor(st.color);
  const sw = r2(Math.min(STROKE_LIMITS[1], Math.max(STROKE_LIMITS[0], st.width)));
  const title = o.title ? `<title>${escapeAttr(o.title)}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(ow)}" height="${r2(oh)}" viewBox="0 0 ${W} ${H}">` +
    title +
    (defs ? `<defs>${defs}</defs>` : '') +
    bgMarkup +
    `<g${filterAttr}><g transform="${iconTransform(s)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${st.linecap}" stroke-linejoin="${st.linejoin}"${st.linejoin === 'miter' ? ' stroke-miterlimit="4"' : ''}>${body}</g></g>` +
    `</svg>`
  );
}

/** Plain 24×24 icon in the library's canonical form (used for "original" downloads). */
export function canonicalSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${BASE_STROKE}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
