import data from '../data/registry.json';
import type { CategoryDef, IconDef } from '../types/index.ts';

export const categories = data.categories as CategoryDef[];
export const icons = data.icons as unknown as IconDef[];
export const iconById = new Map(icons.map((i) => [i.id, i]));
export const categoryById = new Map(categories.map((c) => [c.id, c]));
export const countByCategory = icons.reduce<Record<string, number>>((acc, i) => ((acc[i.c] = (acc[i.c] || 0) + 1), acc), {});
