// "Copy as…" formats for developers.
import type { IconDef, StudioSettings } from '../types/index.ts';
import { composeSvg, safeColor } from './compose.ts';

const pascal = (slug: string) => slug.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase()).replace(/^(\d)/, 'Icon$1');

/** React component: stroke attributes become props with the current settings as defaults. */
export function toJsx(icon: IconDef, s: StudioSettings): string {
  const name = `${pascal(icon.slug)}Icon`;
  const body = icon.b.replace(/\/>/g, ' />').replace(/></g, '>\n      <');
  return `export function ${name}({ size = 24, color = '${safeColor(s.stroke.color)}', strokeWidth = ${s.stroke.width}, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="${s.stroke.linecap}"
      strokeLinejoin="${s.stroke.linejoin}"
      aria-hidden="true"
      {...props}
    >
      ${body}
    </svg>
  );
}
`;
}

export function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%22/g, "'")}`;
}

export function toCss(icon: IconDef, s: StudioSettings): string {
  const svg = composeSvg(icon.b, s, { idPrefix: icon.slug }).replace(/"/g, "'");
  return `.icon-${icon.slug} {\n  width: ${s.canvas.width}px;\n  height: ${s.canvas.height}px;\n  background: url("${toDataUri(svg)}") center / contain no-repeat;\n}\n`;
}

/** SVG sprite with one <symbol> per icon; use as <svg><use href="sprite.svg#slug"/></svg>. */
export function toSprite(list: IconDef[], s: StudioSettings, useCurrentColor = true): string {
  const color = useCurrentColor ? 'currentColor' : safeColor(s.stroke.color);
  const symbols = list
    .map((i) => `  <symbol id="${i.slug}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${s.stroke.width}" stroke-linecap="${s.stroke.linecap}" stroke-linejoin="${s.stroke.linejoin}">${i.b}</symbol>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}\n</svg>\n`;
}

/** Icons that share category, tags and keywords with the given one. */
export function similarIcons(icon: IconDef, all: IconDef[], limit = 10): IconDef[] {
  const kw = new Set(icon.k.map((k) => k.toLowerCase()));
  const tags = new Set(icon.t);
  return all
    .filter((i) => i.id !== icon.id)
    .map((i) => {
      let score = i.c === icon.c ? 2 : 0;
      for (const t of i.t) if (tags.has(t)) score += 1.5;
      for (const k of i.k) if (kw.has(k.toLowerCase())) score += 3;
      return { i, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.i);
}
