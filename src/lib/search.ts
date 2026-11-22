import type { CategoryDef, IconDef } from '../types/index.ts';

/** Lower-case, unify ё/е, apostrophes and Ukrainian/Russian look-alikes for tolerant matching. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`ʼ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface SearchIndexEntry {
  icon: IconDef;
  names: string;
  hay: string;
}

export function buildIndex(icons: IconDef[], categories: CategoryDef[]): SearchIndexEntry[] {
  const catNames = new Map(categories.map((c) => [c.id, Object.values(c.names).join(' ')]));
  return icons.map((icon) => {
    const names = normalize(icon.n.join(' '));
    const hay = normalize([icon.id, icon.slug.replace(/-/g, ' '), icon.slug, icon.c, catNames.get(icon.c) ?? '', icon.d, ...icon.k, ...icon.t].join(' '));
    return { icon, names, hay };
  });
}

/**
 * Every query token must match (AND). Ranking: exact name word > name prefix >
 * name substring > keyword/tag/category match.
 */
export function search(index: SearchIndexEntry[], query: string): IconDef[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return index.map((e) => e.icon);
  const scored: { icon: IconDef; score: number; order: number }[] = [];
  index.forEach((e, order) => {
    let score = 0;
    for (const tk of tokens) {
      const nameWords = e.names.split(' ');
      let s = 0;
      if (nameWords.includes(tk)) s = 10;
      else if (nameWords.some((w) => w.startsWith(tk))) s = 7;
      else if (e.names.includes(tk)) s = 5;
      else if (e.hay.split(' ').some((w) => w.startsWith(tk))) s = 3;
      else if (e.hay.includes(tk)) s = 1;
      if (!s) return;
      score += s;
    }
    if (e.icon.id.toLowerCase() === tokens.join(' ')) score += 50;
    scored.push({ icon: e.icon, score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map((x) => x.icon);
}
