import { ru, type Dict } from './ru.ts';
import type { IconDef, CategoryDef, Locale } from '../types/index.ts';

const dictionaries: Partial<Record<Locale, Dict>> = { ru };
let locale: Locale = 'ru';

export function setLocale(l: Locale) {
  if (dictionaries[l]) locale = l;
}
export function t(key: keyof Dict): string {
  return (dictionaries[locale] ?? ru)[key] ?? ru[key];
}
const idx: Record<Locale, number> = { ru: 0, uk: 1, en: 2 };
export function iconName(icon: IconDef): string {
  return icon.n[idx[locale]];
}
export function categoryName(c: CategoryDef | undefined): string {
  return c ? c.names[locale] : '';
}
