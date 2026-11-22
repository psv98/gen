import { describe, expect, it } from 'vitest';
import { composeSvg, DEFAULT_SETTINGS, cloneSettings, iconBox, safeColor, squirclePath, squircleExponent, canonicalSvg } from '../../src/lib/compose.ts';

const BODY = '<path d="M4 12h16"/>';
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');

describe('composeSvg', () => {
  it('produces well-formed SVG with the chosen stroke settings', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.stroke = { width: 2.6, color: '#FF0000', linecap: 'square', linejoin: 'miter' };
    const svg = composeSvg(BODY, s);
    const doc = parse(svg);
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
    const g = doc.querySelector('g[stroke]')!;
    expect(g.getAttribute('stroke')).toBe('#FF0000');
    expect(g.getAttribute('stroke-width')).toBe('2.6');
    expect(g.getAttribute('stroke-linecap')).toBe('square');
    expect(g.getAttribute('stroke-linejoin')).toBe('miter');
    expect(g.innerHTML).toContain('M4 12h16');
  });

  it('clamps stroke width to the supported range', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.stroke.width = 9;
    expect(composeSvg(BODY, s)).toContain('stroke-width="3.5"');
    s.stroke.width = 0.1;
    expect(composeSvg(BODY, s)).toContain('stroke-width="0.75"');
  });

  it('keeps viewBox at canvas size and scales output dimensions only', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.canvas.width = 400;
    s.canvas.height = 200;
    const svg = composeSvg(BODY, s, { outWidth: 2048, outHeight: 1024 });
    expect(svg).toContain('width="2048" height="1024" viewBox="0 0 400 200"');
  });

  it('renders every background type and shape', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    for (const type of ['solid', 'linear', 'radial'] as const)
      for (const shape of ['square', 'rounded', 'circle', 'squircle'] as const) {
        s.background = { ...s.background, type, shape };
        const doc = parse(composeSvg(BODY, s, { idPrefix: 't' }));
        expect(doc.getElementsByTagName('parsererror').length).toBe(0);
        if (type === 'linear') expect(doc.querySelector('linearGradient')).not.toBeNull();
        if (type === 'radial') expect(doc.querySelector('radialGradient')).not.toBeNull();
        if (shape === 'circle') expect(doc.querySelector('circle')).not.toBeNull();
      }
  });

  it('writes a drop-shadow filter only when enabled', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    expect(composeSvg(BODY, s)).not.toContain('feDropShadow');
    s.shadow.enabled = true;
    expect(composeSvg(BODY, s)).toContain('feDropShadow');
  });

  it('supports currentColor output and rejects unsafe colour strings', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    expect(composeSvg(BODY, s, { useCurrentColor: true })).toContain('stroke="currentColor"');
    expect(safeColor('red;"><script>')).toBe('#000000');
    expect(safeColor('#ABC')).toBe('#ABC');
  });

  it('positions the icon box with padding and alignment without distortion', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.canvas = { ...s.canvas, width: 300, height: 100, iconSize: 60, padding: 10, alignX: 'end', alignY: 'start' };
    expect(iconBox(s)).toEqual({ x: 230, y: 10, size: 60 });
    s.canvas.flipX = true;
    s.canvas.rotation = 90;
    const svg = composeSvg(BODY, s);
    expect(svg).toContain('rotate(90)');
    expect(svg).toMatch(/scale\(-2\.5 2\.5\)/);
  });

  it('builds a closed squircle path', () => {
    const d = squirclePath(100, 100, squircleExponent(25));
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(squircleExponent(50)).toBeCloseTo(2.5);
  });

  it('canonical SVG keeps the library defaults', () => {
    const svg = canonicalSvg(BODY);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('stroke-width="1.8"');
  });
});
