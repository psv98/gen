import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sampleBody, bbox, strokeRange, normalizeBody } from '../../scripts/lib/geometry.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'src/data/registry.json'), 'utf8'));

describe('icon library', () => {
  it('contains 500 icons, 50 per category', () => {
    expect(reg.icons.length).toBe(500);
    for (const c of reg.categories) expect(reg.icons.filter((i) => i.c === c.id).length).toBe(50);
  });
  it('has unique ids, slugs and geometry', () => {
    expect(new Set(reg.icons.map((i) => i.id)).size).toBe(500);
    expect(new Set(reg.icons.map((i) => i.slug)).size).toBe(500);
    expect(new Set(reg.icons.map((i) => normalizeBody(i.b))).size).toBe(500);
  });
  it('every icon has trilingual names, keywords and a valid stroke range', () => {
    for (const i of reg.icons) {
      expect(i.n.every(Boolean)).toBe(true);
      expect(i.k.length).toBeGreaterThan(2);
      expect(i.s[0]).toBe(0.75);
      expect(i.s[1]).toBeGreaterThanOrEqual(1.8);
      expect(i.s[1]).toBeLessThanOrEqual(3.5);
    }
  });
  it('keeps geometry inside the 24×24 box with a 1px margin', () => {
    for (const i of reg.icons) {
      const b = bbox(sampleBody(i.b));
      expect(b.x0).toBeGreaterThanOrEqual(1);
      expect(b.y0).toBeGreaterThanOrEqual(1);
      expect(b.x1).toBeLessThanOrEqual(23);
      expect(b.y1).toBeLessThanOrEqual(23);
    }
  });
  it('never sets stroke or fill on child elements', () => {
    for (const i of reg.icons) expect(i.b).not.toMatch(/\s(stroke|fill|stroke-width|style)=/);
  });
});

describe('geometry helpers', () => {
  it('samples rotated rects', () => {
    const b = bbox(sampleBody('<rect x="5" y="6.8" width="8" height="4.4" rx="1" transform="rotate(-45 9 9)"/>'));
    expect(b.x0).toBeGreaterThan(4.9);
    expect(b.x1).toBeLessThan(13.1);
  });
  it('reports the gap between separate parts', () => {
    const r = strokeRange(sampleBody('<path d="M4 4h16M4 7h16"/>'));
    expect(r.gap).toBeCloseTo(3, 1);
    expect(r.range[1]).toBeCloseTo(3, 1);
  });
});
