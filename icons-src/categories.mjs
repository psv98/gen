// Category registry. Order defines catalog order.
export const categories = [
  { id: 'legal', prefix: 'LAW', names: { ru: 'Право и юриспруденция', uk: 'Право та юриспруденція', en: 'Legal & Law' } },
  { id: 'media', prefix: 'MDA', names: { ru: 'Медиа и журналистика', uk: 'Медіа та журналістика', en: 'Media & Journalism' } },
  { id: 'technology', prefix: 'TEC', names: { ru: 'Технологии и IT', uk: 'Технології та IT', en: 'Technology & IT' } },
  { id: 'healthcare', prefix: 'HLT', names: { ru: 'Медицина', uk: 'Медицина', en: 'Healthcare & Medicine' } },
  { id: 'finance', prefix: 'FIN', names: { ru: 'Финансы и банки', uk: 'Фінанси та банки', en: 'Finance & Banking' } },
  { id: 'documents', prefix: 'DOC', names: { ru: 'Документы и учёт', uk: 'Документи та облік', en: 'Documents & Accounting' } },
  { id: 'government', prefix: 'GOV', names: { ru: 'Государство и дипломатия', uk: 'Держава та дипломатія', en: 'Government & Diplomacy' } },
  { id: 'ngo', prefix: 'NGO', names: { ru: 'НКО и благотворительность', uk: 'ГО та благодійність', en: 'NGO & Charity' } },
  { id: 'security', prefix: 'SEC', names: { ru: 'Безопасность и оборона', uk: 'Безпека та оборона', en: 'Security & Defense' } },
  { id: 'business', prefix: 'BIZ', names: { ru: 'Бизнес и маркетинг', uk: 'Бізнес та маркетинг', en: 'Business & Marketing' } },
];

// Root attributes shared by every icon in the system.
export const ROOT_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
