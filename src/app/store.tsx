import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Collection, IconDef, Preset, StudioSettings } from '../types/index.ts';
import { DEFAULT_SETTINGS, cloneSettings } from '../lib/compose.ts';
import { useHistory } from '../lib/history.ts';
import { readStore, useStoredState, writeStore } from '../lib/storage.ts';
import { icons, iconById } from '../lib/registry.ts';
import { useEffect } from 'react';

export type FilterKind = 'all' | 'favorites' | 'recent' | 'category' | 'collection';
export interface Filter { kind: FilterKind; id?: string }
export type SortKind = 'default' | 'name' | 'category';
export type Zoom = 'fit' | number;
export interface Toast { id: number; text: string; tone?: 'ok' | 'error' }

function useStudioState() {
  const history = useHistory<StudioSettings>(readStore('settings', cloneSettings(DEFAULT_SETTINGS)));
  useEffect(() => writeStore('settings', history.value), [history.value]);

  const [selectedId, setSelectedId] = useStoredState<string>('selected', icons[0]?.id ?? '');
  const [favorites, setFavorites] = useStoredState<string[]>('favorites', []);
  const [recent, setRecent] = useStoredState<string[]>('recent', []);
  const [collections, setCollections] = useStoredState<Collection[]>('collections', []);
  const [customPresets, setCustomPresets] = useStoredState<Preset[]>('presets', []);
  const [theme, setTheme] = useStoredState<'dark' | 'light'>('theme', 'dark');
  const [checker, setChecker] = useStoredState<'light' | 'dark'>('checker', 'light');
  const [showGrid, setShowGrid] = useStoredState<boolean>('grid', true);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [sort, setSort] = useState<SortKind>('default');
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [presetDialog, setPresetDialog] = useState(false);
  const [drawer, setDrawer] = useState<'none' | 'library' | 'inspector'>('none');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const selected: IconDef | undefined = iconById.get(selectedId) ?? icons[0];

  const selectIcon = useCallback(
    (id: string) => {
      setSelectedId(id);
      setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 30));
    },
    [setSelectedId, setRecent],
  );

  const toggleFavorite = useCallback((id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])), [setFavorites]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const update = useCallback(
    <K extends keyof StudioSettings>(group: K, patch: Partial<StudioSettings[K]>, coalesceKey?: string) => {
      history.set((s) => ({ ...s, [group]: { ...s[group], ...patch } }), coalesceKey ? `${group}.${coalesceKey}` : '');
    },
    [history],
  );

  return {
    settings: history.value,
    setSettings: history.set,
    update,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    selected,
    selectIcon,
    favorites,
    toggleFavorite,
    recent,
    collections,
    setCollections,
    customPresets,
    setCustomPresets,
    theme,
    setTheme,
    checker,
    setChecker,
    showGrid,
    setShowGrid,
    query,
    setQuery,
    filter,
    setFilter,
    sort,
    setSort,
    selectMode,
    setSelectMode,
    selection,
    setSelection,
    focusMode,
    setFocusMode,
    compare,
    setCompare,
    zoom,
    setZoom,
    exportOpen,
    setExportOpen,
    shortcutsOpen,
    setShortcutsOpen,
    presetDialog,
    setPresetDialog,
    drawer,
    setDrawer,
    toasts,
    toast,
    visibleIds,
    setVisibleIds,
  };
}

export type Studio = ReturnType<typeof useStudioState>;
const Ctx = createContext<Studio | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const state = useStudioState();
  const value = useMemo(() => state, Object.values(state)); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio(): Studio {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStudio outside provider');
  return s;
}
