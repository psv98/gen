import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useStudio } from '../../app/store.tsx';
import { buildIndex, normalize, search } from '../../lib/search.ts';
import { categories, icons } from '../../lib/registry.ts';
import { categoryName, iconName } from '../../i18n/index.ts';
import { cx } from '../../components/ui.tsx';

const index = buildIndex(icons, categories);

interface Item { key: string; label: string; hint: string; glyph?: string; run: () => void }

/** Ctrl/⌘+K: jump to any icon or run a command without leaving the keyboard. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStudio();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  const actions: Item[] = useMemo(() => [
    { key: 'a-export', label: 'Экспорт…', hint: 'E', run: () => s.setExportOpen(true) },
    { key: 'a-theme', label: s.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема', hint: 'Тема', run: () => s.setTheme(s.theme === 'dark' ? 'light' : 'dark') },
    { key: 'a-grid', label: s.showGrid ? 'Скрыть сетку холста' : 'Показать сетку холста', hint: 'G', run: () => s.setShowGrid(!s.showGrid) },
    { key: 'a-compare', label: s.compare ? 'Выключить сравнение' : 'Сравнить с оригиналом', hint: 'C', run: () => s.setCompare(!s.compare) },
    { key: 'a-focus', label: 'Режим фокусировки', hint: 'F', run: () => s.setFocusMode(!s.focusMode) },
    { key: 'a-fav', label: 'Открыть избранное', hint: 'Фильтр', run: () => s.setFilter({ kind: 'favorites' }) },
    { key: 'a-preset', label: 'Сохранить пресет…', hint: 'Пресеты', run: () => s.setPresetDialog(true) },
    { key: 'a-quality', label: 'Icon Quality Gallery', hint: 'Контроль качества', run: () => { window.location.hash = '#quality'; } },
    { key: 'a-random', label: 'Случайная иконка', hint: 'Вдохновение', run: () => s.selectIcon(icons[Math.floor(Math.random() * icons.length)].id) },
    ...categories.map((c) => ({ key: 'c-' + c.id, label: `Категория: ${categoryName(c)}`, hint: 'Фильтр', run: () => s.setFilter({ kind: 'category', id: c.id }) })),
  ], [s]);

  const items: Item[] = useMemo(() => {
    const nq = normalize(q);
    const acts = nq ? actions.filter((a) => normalize(a.label).includes(nq)) : actions.slice(0, 6);
    const found = (nq ? search(index, q) : []).slice(0, 12).map((i) => ({ key: i.id, label: iconName(i), hint: `${i.id} · ${i.n[2]}`, glyph: i.b, run: () => { s.selectIcon(i.id); s.setQuery(''); } }));
    return [...found, ...acts];
  }, [q, actions, s]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;
  const run = (it?: Item) => { if (!it) return; it.run(); onClose(); };

  return (
    <div className="anim-fade fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Командная палитра" className="anim-pop w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]">
        <div className="flex h-12 items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); run(items[active]); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }}
            placeholder="Иконка, категория или команда"
            aria-label="Поиск по иконкам и командам"
            className="h-full flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-muted focus-visible:outline-none"
          />
          <kbd className="rounded border border-line-strong px-1.5 font-mono text-[10px] text-muted">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
          {items.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted">Ничего не найдено</p>}
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="option"
              aria-selected={i === active}
              data-idx={i}
              onMouseMove={() => setActive(i)}
              onClick={() => run(it)}
              className={cx('flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors', i === active ? 'bg-accent-soft' : 'hover:bg-raised')}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel-2 text-fg">
                {it.glyph ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: it.glyph }} /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{it.label}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">{it.hint}</span>
              {i === active && <CornerDownLeft size={14} className="shrink-0 text-muted" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
