import { describe, expect, it } from 'vitest';
import { buildIndex, normalize, search } from '../../src/lib/search.ts';
import { categories, icons } from '../../src/lib/registry.ts';

const index = buildIndex(icons, categories);
const ids = (q: string) => search(index, q).map((i) => i.slug);

describe('search', () => {
  it('normalises case, ё and punctuation', () => {
    expect(normalize('Ёлка, ЁЖ!')).toBe('елка еж');
  });
  it('finds icons in Russian, Ukrainian and English', () => {
    expect(ids('весы')[0]).toBe('scales-of-justice');
    expect(ids('терези')[0]).toBe('scales-of-justice');
    expect(ids('scales')[0]).toBe('scales-of-justice');
  });
  it('finds by ID and slug', () => {
    expect(ids('LAW-002')[0]).toBe('gavel');
    expect(ids('piggy-bank')[0]).toBe('piggy-bank');
  });
  it('matches by category name and keywords', () => {
    expect(search(index, 'медицина').length).toBeGreaterThanOrEqual(50);
    expect(ids('фактчекинг')).toContain('fact-check');
  });
  it('requires every token to match', () => {
    expect(ids('щит пером')).toContain('journalist-safety');
    expect(ids('щит zzzz')).toEqual([]);
  });
  it('returns the full catalogue for an empty query', () => {
    expect(search(index, '   ').length).toBe(icons.length);
  });
});
