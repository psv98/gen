import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from 'react';
import { Search, X, Star, Clock, LayoutGrid, FolderPlus, Folder, Trash2, CheckSquare, Square, FilterX, Grid2x2, Grid3x3, LayoutGrid as Grid4, Brush } from 'lucide-react';
import { useStudio, type Filter } from '../../app/store.tsx';
import { categories, countByCategory, icons } from '../../lib/registry.ts';
import { buildIndex, search } from '../../lib/search.ts';
import { categoryName, iconName, t } from '../../i18n/index.ts';
import { Button, Dialog, IconButton, cx } from '../../components/ui.tsx';
import { setDragData } from '../../lib/export.ts';
import { canonicalSvg } from '../../lib/compose.ts';
import type { IconDef } from '../../types/index.ts';

const index = buildIndex(icons, categories);

function NavItem({ active, onClick, icon, label, count, onDelete }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number; onDelete?: () => void }) {
  return (
    <div className={cx('group flex h-8 items-center rounded-lg pr-1 transition-colors', active ? 'bg-accent-soft text-fg' : 'text-fg-2 hover:bg-raised hover:text-fg')}>
      <button type="button" onClick={onClick} aria-current={active} className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2.5 text-left text-[13px]">
        <span className={cx('shrink-0', active ? 'text-accent-hi' : 'text-muted')}>{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      {onDelete && (
        <button type="button" aria-label={`${t('delete')}: ${label}`} onClick={onDelete} className="mr-1 hidden h-6 w-6 items-center justify-center rounded text-muted hover:text-danger group-hover:flex focus-visible:flex">
          <Trash2 size={13} />
        </button>
      )}
      {count !== undefined && <span className="mr-1.5 font-mono text-[11px] text-muted">{count}</span>}
    </div>
  );
}

const Thumb = memo(function Thumb({ icon, active, checked, fav, selectMode, onPick, style, glyph, stroke }: { icon: IconDef; active: boolean; checked: boolean; fav: boolean; selectMode: boolean; onPick: (e: React.MouseEvent, icon: IconDef) => void; style: React.CSSProperties; glyph: number; stroke: { width: number; linecap: string; linejoin: string; color?: string } }) {
  const name = iconName(icon);
  return (
    <button
      type="button"
      style={style}
      data-icon-id={icon.id}
      title={`${name} · ${icon.id}`}
      aria-label={name}
      aria-pressed={selectMode ? checked : active}
      onClick={(e) => onPick(e, icon)}
      draggable
      onDragStart={(e) => setDragData(e, `${icon.slug}.svg`, canonicalSvg(icon.b))}
      className={cx(
        'group absolute flex items-center justify-center rounded-xl border text-fg transition-[background,border-color,transform,box-shadow] duration-150',
        active ? 'border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]' : checked ? 'border-blue bg-blue/10' : 'border-transparent hover:border-line-strong hover:bg-raised active:scale-95',
      )}
    >
      <svg viewBox="0 0 24 24" width={glyph} height={glyph} fill="none" stroke={stroke.color ?? 'currentColor'} strokeWidth={stroke.width} strokeLinecap={stroke.linecap as 'round'} strokeLinejoin={stroke.linejoin as 'round'} aria-hidden className="pointer-events-none transition-transform duration-150 group-hover:scale-110" dangerouslySetInnerHTML={{ __html: icon.b }} />
      {fav && <Star size={9} className="absolute right-1.5 top-1.5 fill-current text-accent-hi" aria-hidden />}
      {selectMode && (
        <span className={cx('absolute left-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border', checked ? 'border-blue bg-blue' : 'border-line-strong bg-panel')}>
          {checked && <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2.5 6 2.5 2.5 4.5-5" /></svg>}
        </span>
      )}
    </button>
  );
});

const SIZES = { s: { cell: 42, glyph: 20 }, m: { cell: 52, glyph: 24 }, l: { cell: 72, glyph: 32 } } as const;
const GAP = 6;

function VirtualGrid({ list }: { list: IconDef[] }) {
  const s = useStudio();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  const [height, setHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const lastClicked = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { setWidth(el.clientWidth); setHeight(el.clientHeight); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { cell: CELL, glyph } = SIZES[s.gridSize];
  const st = s.settings.stroke;
  const stroke = useMemo(() => (s.gridStyled ? { width: st.width, linecap: st.linecap, linejoin: st.linejoin } : { width: 1.8, linecap: 'round', linejoin: 'round' }), [s.gridStyled, st.width, st.linecap, st.linejoin]);
  const cols = Math.max(1, Math.floor((width - 16 + GAP) / (CELL + GAP)));
  const rows = Math.ceil(list.length / cols);
  const cellW = (width - 16 - GAP * (cols - 1)) / cols;
  const rowH = CELL + GAP;
  const start = Math.max(0, Math.floor(scrollTop / rowH) - 3);
  const end = Math.min(rows, Math.ceil((scrollTop + height) / rowH) + 3);

  // Keep the active icon in view when it changes via keyboard.
  useEffect(() => {
    const i = list.findIndex((x) => x.id === s.selected?.id);
    const el = ref.current;
    if (i < 0 || !el) return;
    const top = Math.floor(i / cols) * rowH;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + rowH > el.scrollTop + el.clientHeight) el.scrollTop = top + rowH - el.clientHeight + 8;
  }, [s.selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const favSet = useMemo(() => new Set(s.favorites), [s.favorites]);
  const selSet = useMemo(() => new Set(s.selection), [s.selection]);

  const onPick = (e: React.MouseEvent, icon: IconDef) => {
    const multi = s.selectMode || e.metaKey || e.ctrlKey || e.shiftKey;
    if (multi) {
      if (!s.selectMode) s.setSelectMode(true);
      if (e.shiftKey && lastClicked.current) {
        const a = list.findIndex((x) => x.id === lastClicked.current), b = list.findIndex((x) => x.id === icon.id);
        const range = list.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.id);
        s.setSelection((sel) => [...new Set([...sel, ...range])]);
      } else s.setSelection((sel) => (sel.includes(icon.id) ? sel.filter((x) => x !== icon.id) : [...sel, icon.id]));
      lastClicked.current = icon.id;
      s.selectIcon(icon.id);
      return;
    }
    lastClicked.current = icon.id;
    s.selectIcon(icon.id);
  };

  const items = [];
  for (let r = start; r < end; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const icon = list[i];
      if (!icon) break;
      items.push(
        <Thumb
          key={icon.id}
          icon={icon}
          active={s.selected?.id === icon.id}
          checked={selSet.has(icon.id)}
          fav={favSet.has(icon.id)}
          selectMode={s.selectMode}
          onPick={onPick}
          glyph={glyph}
          stroke={stroke}
          style={{ top: r * rowH, left: 8 + c * (cellW + GAP), width: cellW, height: CELL }}
        />,
      );
    }

  return (
    <div ref={ref} onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)} className="relative min-h-0 flex-1 overflow-y-auto pt-1" data-testid="icon-grid">
      <div style={{ height: rows * rowH + 8 }} className="relative anim-fade" key={list.length}>
        {items}
      </div>
    </div>
  );
}

export function LibraryPanel() {
  const s = useStudio();
  const deferredQuery = useDeferredValue(s.query);
  const searchRef = useRef<HTMLInputElement>(null);
  const [newCol, setNewCol] = useState(false);
  const [colName, setColName] = useState('');

  useEffect(() => {
    const focus = () => searchRef.current?.focus();
    window.addEventListener('icon-studio:focus-search', focus);
    return () => window.removeEventListener('icon-studio:focus-search', focus);
  }, []);

  const list = useMemo(() => {
    let base = search(index, deferredQuery);
    const f = s.filter;
    if (f.kind === 'category') base = base.filter((i) => i.c === f.id);
    else if (f.kind === 'favorites') { const set = new Set(s.favorites); base = base.filter((i) => set.has(i.id)); }
    else if (f.kind === 'recent') { const order = new Map(s.recent.map((id, n) => [id, n])); base = base.filter((i) => order.has(i.id)); if (!deferredQuery) base.sort((a, b) => order.get(a.id)! - order.get(b.id)!); }
    else if (f.kind === 'collection') { const col = s.collections.find((c) => c.id === f.id); const set = new Set(col?.icons ?? []); base = base.filter((i) => set.has(i.id)); }
    if (s.sort === 'name') base = [...base].sort((a, b) => iconName(a).localeCompare(iconName(b), 'ru'));
    else if (s.sort === 'category') { const ord = new Map(categories.map((c, n) => [c.id, n])); base = [...base].sort((a, b) => ord.get(a.c)! - ord.get(b.c)! || a.id.localeCompare(b.id)); }
    return base;
  }, [deferredQuery, s.filter, s.favorites, s.recent, s.collections, s.sort]);

  const { setVisibleIds } = s;
  useEffect(() => setVisibleIds(list.map((i) => i.id)), [list, setVisibleIds]);

  const is = (f: Filter) => s.filter.kind === f.kind && s.filter.id === f.id;
  const pick = (f: Filter) => { s.setFilter(f); };
  const filtersActive = !!s.query || s.filter.kind !== 'all' || s.sort !== 'default';

  const empty =
    s.filter.kind === 'favorites' && !s.favorites.length ? t('emptyFavorites')
    : s.filter.kind === 'recent' && !s.recent.length ? t('emptyRecent')
    : s.filter.kind === 'collection' && !s.query ? t('emptyCollection')
    : t('emptyText');

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel" aria-label={t('library')}>
      <div className="space-y-3 border-b border-line p-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            type="search"
            value={s.query}
            onChange={(e) => s.setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { s.setQuery(''); (e.target as HTMLInputElement).blur(); } }}
            placeholder={t('search')}
            aria-label={t('search')}
            title={t('searchHint')}
            className="h-9 w-full rounded-lg border border-line bg-panel-2 pl-9 pr-16 text-[13px] text-fg outline-none placeholder:text-muted focus:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {s.query ? (
            <button type="button" aria-label="Очистить поиск" onClick={() => s.setQuery('')} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-fg">
              <X size={14} />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line-strong px-1.5 font-mono text-[10px] text-muted">/</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="max-h-[42%] shrink-0 space-y-0.5 overflow-y-auto border-b border-line p-2" aria-label={t('categories')}>
          <NavItem active={is({ kind: 'all' })} onClick={() => pick({ kind: 'all' })} icon={<LayoutGrid size={15} />} label={t('all')} count={icons.length} />
          <NavItem active={is({ kind: 'favorites' })} onClick={() => pick({ kind: 'favorites' })} icon={<Star size={15} />} label={t('favorites')} count={s.favorites.length} />
          <NavItem active={is({ kind: 'recent' })} onClick={() => pick({ kind: 'recent' })} icon={<Clock size={15} />} label={t('recent')} count={s.recent.length} />
          <div className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t('categories')}</div>
          {categories.map((c) => (
            <NavItem
              key={c.id}
              active={is({ kind: 'category', id: c.id })}
              onClick={() => pick({ kind: 'category', id: c.id })}
              icon={<span className="block h-[15px] w-[15px]"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icons.find((i) => i.c === c.id)?.b ?? '' }} /></span>}
              label={categoryName(c)}
              count={countByCategory[c.id] ?? 0}
            />
          ))}
          <div className="flex items-center justify-between px-2.5 pb-1 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t('collections')}</span>
            <IconButton label={t('newCollection')} className="h-6 w-6" onClick={() => { setColName(''); setNewCol(true); }}><FolderPlus size={14} /></IconButton>
          </div>
          {s.collections.map((c) => (
            <NavItem
              key={c.id}
              active={is({ kind: 'collection', id: c.id })}
              onClick={() => pick({ kind: 'collection', id: c.id })}
              icon={<Folder size={15} />}
              label={c.name}
              count={c.icons.length}
              onDelete={() => { s.setCollections((cs) => cs.filter((x) => x.id !== c.id)); if (is({ kind: 'collection', id: c.id })) pick({ kind: 'all' }); }}
            />
          ))}
        </nav>

        <div className="flex h-10 shrink-0 items-center gap-1 px-2">
          <select
            aria-label="Сортировка"
            value={s.sort}
            onChange={(e) => s.setSort(e.target.value as typeof s.sort)}
            className="h-7 w-[108px] rounded-md border border-line bg-panel-2 px-1.5 text-[12px] text-fg-2 outline-none focus:border-accent"
          >
            <option value="default">{t('sortDefault')}</option>
            <option value="name">{t('sortName')}</option>
            <option value="category">{t('sortCategory')}</option>
          </select>
          <IconButton
            label={t('selectMode')}
            active={s.selectMode}
            className="h-7 w-7"
            onClick={() => { s.setSelectMode(!s.selectMode); if (s.selectMode) s.setSelection([]); }}
          >
            {s.selectMode ? <CheckSquare size={15} /> : <Square size={15} />}
          </IconButton>
          <IconButton
            label={s.gridSize === 's' ? 'Плотность: мелкие' : s.gridSize === 'm' ? 'Плотность: средние' : 'Плотность: крупные'}
            className="h-7 w-7"
            onClick={() => s.setGridSize(s.gridSize === 's' ? 'm' : s.gridSize === 'm' ? 'l' : 's')}
          >
            {s.gridSize === 's' ? <Grid4 size={15} /> : s.gridSize === 'm' ? <Grid3x3 size={15} /> : <Grid2x2 size={15} />}
          </IconButton>
          <IconButton label="Показывать сетку с текущей обводкой" active={s.gridStyled} className="h-7 w-7" onClick={() => s.setGridStyled(!s.gridStyled)}>
            <Brush size={15} />
          </IconButton>
          {filtersActive && (
            <IconButton label={t('clearFilters')} className="h-7 w-7" onClick={() => { s.setQuery(''); s.setFilter({ kind: 'all' }); s.setSort('default'); }}>
              <FilterX size={15} />
            </IconButton>
          )}
          <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-muted" aria-live="polite" data-testid="result-count">
            {list.length} {t('of')} {icons.length}
          </span>
        </div>

        {s.selectMode && (
          <div className="anim-fade mx-2 mb-1 flex items-center gap-1 rounded-lg border border-blue/40 bg-blue/10 px-2 py-1.5 text-[12px]">
            <span className="text-fg-2">{t('selected')}: <b className="font-mono text-fg">{s.selection.length}</b></span>
            <button type="button" className="ml-auto rounded px-1.5 py-0.5 text-blue hover:bg-blue/10" onClick={() => s.setSelection([...new Set([...s.selection, ...list.map((i) => i.id)])])}>Все</button>
            <button type="button" className="rounded px-1.5 py-0.5 text-fg-2 hover:bg-raised" onClick={() => s.setSelection([])} disabled={!s.selection.length}>Снять</button>
            <Button size="sm" variant="primary" disabled={!s.selection.length} onClick={() => s.setExportOpen(true)}>ZIP</Button>
          </div>
        )}

        {list.length ? (
          <VirtualGrid list={list} />
        ) : (
          <div className="anim-fade flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center" role="status">
            <Search size={28} className="text-line-strong" />
            <p className="text-[13px] font-medium text-fg">{t('emptyTitle')}</p>
            <p className="text-[12px] leading-relaxed text-muted">{empty}</p>
            {filtersActive && <Button size="sm" className="mt-2" onClick={() => { s.setQuery(''); s.setFilter({ kind: 'all' }); }}>{t('clearFilters')}</Button>}
          </div>
        )}
      </div>

      <Dialog open={newCol} onClose={() => setNewCol(false)} title={t('newCollection')} width={380}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = colName.trim();
            if (!name) return;
            const id = 'col-' + Date.now().toString(36);
            s.setCollections((cs) => [...cs, { id, name, icons: s.selectMode && s.selection.length ? [...s.selection] : [] }]);
            s.setFilter({ kind: 'collection', id });
            setNewCol(false);
          }}
          className="space-y-4"
        >
          <input autoFocus value={colName} onChange={(e) => setColName(e.target.value)} placeholder={t('collectionName')} aria-label={t('collectionName')} maxLength={48} className="h-9 w-full rounded-lg border border-line bg-panel-2 px-3 text-[13px] outline-none focus:border-accent" />
          {s.selectMode && s.selection.length > 0 && <p className="text-[12px] text-muted">В коллекцию попадут выбранные иконки: {s.selection.length}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewCol(false)}>{t('cancel')}</Button>
            <Button variant="primary" type="submit" disabled={!colName.trim()}>{t('create')}</Button>
          </div>
        </form>
      </Dialog>
    </aside>
  );
}
