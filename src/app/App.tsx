import { useEffect, useState, lazy, Suspense } from 'react';
import { Undo2, Redo2, Bookmark, Sun, Moon, Download, Keyboard, PanelLeft, SlidersHorizontal, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { StudioProvider, useStudio } from './store.tsx';
import { LibraryPanel } from '../features/library/LibraryPanel.tsx';
import { CanvasView } from '../features/canvas/CanvasView.tsx';
import { Inspector } from '../features/inspector/Inspector.tsx';
import { ExportDialog } from '../features/export/ExportDialog.tsx';
import { Button, Dialog, IconButton, Kbd, cx } from '../components/ui.tsx';
import { composeSvg, cloneSettings } from '../lib/compose.ts';
import { copyText } from '../lib/export.ts';
import { icons } from '../lib/registry.ts';
import { iconName, t } from '../i18n/index.ts';

const QualityGallery = lazy(() => import('../features/quality/QualityGallery.tsx'));

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" rx="7" fill="var(--accent)" />
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="12" height="12" rx="3" />
          <path d="M7 13h12M13 7v12" strokeOpacity=".55" />
          <circle cx="13" cy="13" r="2.2" />
        </g>
      </svg>
      <span className="hidden text-[14px] font-semibold tracking-[-0.01em] sm:inline">Icon Studio</span>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl/⌘ + Z', 'Отменить'],
  ['Ctrl/⌘ + Shift + Z, Ctrl + Y', 'Повторить'],
  ['/', 'Поиск'],
  ['← →', 'Предыдущая / следующая иконка'],
  ['S', 'В избранное'],
  ['G', 'Сетка'],
  ['C', 'Сравнение с оригиналом'],
  ['F', 'Режим фокусировки'],
  ['+  −  0  1', 'Масштаб: больше, меньше, вписать, 100%'],
  ['E', 'Экспорт'],
  ['Ctrl/⌘ + Shift + C', 'Копировать SVG'],
  ['Esc', 'Закрыть окно / выйти из фокуса'],
  ['?', 'Эта справка'],
];

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return /^#\/?quality/.test(hash) ? 'quality' : 'studio';
}

function useShortcuts() {
  const s = useStudio();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.closest('input, textarea, select, [contenteditable="true"]');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); s.redo(); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'c' && s.selected) {
        e.preventDefault();
        copyText(composeSvg(s.selected.b, s.settings, { idPrefix: s.selected.slug })).then(() => s.toast(t('copied') + ': SVG'), () => s.toast(t('copyFailed'), 'error'));
        return;
      }
      if (typing || mod || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key;
      if (k === '/') { e.preventDefault(); s.setDrawer('library'); window.dispatchEvent(new Event('icon-studio:focus-search')); }
      else if (k === 'Escape') { if (s.focusMode) s.setFocusMode(false); s.setDrawer('none'); }
      else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') s.setFocusMode(!s.focusMode);
      else if (k === 'g' || k === 'G' || k === 'п' || k === 'П') s.setShowGrid(!s.showGrid);
      else if (k === 'c' || k === 'C' || k === 'с' || k === 'С') s.setCompare(!s.compare);
      else if (k === 'e' || k === 'E' || k === 'у' || k === 'У') s.setExportOpen(true);
      else if ((k === 's' || k === 'S' || k === 'ы' || k === 'Ы') && s.selected) s.toggleFavorite(s.selected.id);
      else if (k === '?') s.setShortcutsOpen(true);
      else if (k === '0') s.setZoom('fit');
      else if (k === '1') s.setZoom(1);
      else if (k === '+' || k === '=') document.querySelector<HTMLButtonElement>('[aria-label^="Увеличить"]')?.click();
      else if (k === '-' || k === '_') document.querySelector<HTMLButtonElement>('[aria-label^="Уменьшить"]')?.click();
      else if (k === 'ArrowRight' || k === 'ArrowLeft') {
        const ids = s.visibleIds.length ? s.visibleIds : icons.map((i) => i.id);
        const i = ids.indexOf(s.selected?.id ?? '');
        const next = ids[(i + (k === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
        if (next) { e.preventDefault(); s.selectIcon(next); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);
}

function TopBar() {
  const s = useStudio();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <IconButton label={t('library')} className="lg:hidden" active={s.drawer === 'library'} onClick={() => s.setDrawer(s.drawer === 'library' ? 'none' : 'library')}><PanelLeft size={16} /></IconButton>
      <Logo />
      <span className="mx-2 hidden h-5 w-px bg-line sm:block" />
      <span className="hidden min-w-0 truncate text-[13px] text-fg-2 sm:block" data-testid="topbar-icon">{s.selected ? iconName(s.selected) : ''}</span>
      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label={`${t('undo')} (Ctrl+Z)`} disabled={!s.canUndo} onClick={s.undo}><Undo2 size={16} /></IconButton>
        <IconButton label={`${t('redo')} (Ctrl+Shift+Z)`} disabled={!s.canRedo} onClick={s.redo}><Redo2 size={16} /></IconButton>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <IconButton label={t('savePreset')} className="hidden sm:inline-flex" onClick={() => s.setPresetDialog(true)}><Bookmark size={16} /></IconButton>
        <IconButton label={t('theme')} onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')}>{s.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</IconButton>
        <a href="#quality" className="hidden sm:inline-flex" aria-label={t('quality')}><IconButton label={t('quality')} tabIndex={-1}><ShieldCheck size={16} /></IconButton></a>
        <IconButton label={`${t('shortcuts')} (?)`} className="hidden md:inline-flex" onClick={() => s.setShortcutsOpen(true)} tipPos="left"><Keyboard size={16} /></IconButton>
        <IconButton label={t('inspector')} className="lg:hidden" active={s.drawer === 'inspector'} onClick={() => s.setDrawer(s.drawer === 'inspector' ? 'none' : 'inspector')} tipPos="left"><SlidersHorizontal size={16} /></IconButton>
        <Button variant="primary" className="ml-1.5" onClick={() => s.setExportOpen(true)} data-testid="open-export"><Download size={14} /><span className="hidden sm:inline">{t('export')}</span></Button>
      </div>
    </header>
  );
}

function PresetDialog() {
  const s = useStudio();
  const [name, setName] = useState('');
  useEffect(() => { if (s.presetDialog) setName(''); }, [s.presetDialog]);
  return (
    <Dialog open={s.presetDialog} onClose={() => s.setPresetDialog(false)} title={t('savePreset')} width={380}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          s.setCustomPresets((p) => [...p, { id: 'p-' + Date.now().toString(36), name: name.trim(), settings: cloneSettings(s.settings) }]);
          s.setPresetDialog(false);
          s.toast(t('presetSaved'));
        }}
      >
        <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t('presetName')} aria-label={t('presetName')} className="h-9 w-full rounded-lg border border-line bg-panel-2 px-3 text-[13px] outline-none focus:border-accent" />
        <p className="text-[12px] text-muted">Сохраняются обводка, фон, холст и эффекты. Пресеты хранятся в этом браузере.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => s.setPresetDialog(false)}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>{t('save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Toasts() {
  const { toasts } = useStudio();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className="anim-toast flex items-center gap-2 rounded-xl border border-line-strong bg-raised px-3.5 py-2 text-[13px] shadow-[var(--shadow)]">
          {x.tone === 'error' ? <AlertCircle size={15} className="text-danger" /> : <CheckCircle2 size={15} className="text-ok" />}
          {x.text}
        </div>
      ))}
    </div>
  );
}

function Studio() {
  const s = useStudio();
  useShortcuts();
  const side = !s.focusMode;
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        {s.drawer !== 'none' && <div className="fixed inset-0 top-12 z-30 bg-black/40 lg:hidden anim-fade" onClick={() => s.setDrawer('none')} />}
        <div
          className={cx(
            'z-40 w-[300px] shrink-0 border-r border-line transition-transform duration-200',
            'fixed bottom-0 left-0 top-12 lg:static lg:translate-x-0',
            s.drawer === 'library' ? 'translate-x-0' : '-translate-x-full',
            !side && 'lg:hidden',
          )}
        >
          <LibraryPanel />
        </div>
        <CanvasView />
        <div
          className={cx(
            'z-40 w-[320px] shrink-0 border-l border-line transition-transform duration-200',
            'fixed bottom-0 right-0 top-12 lg:static lg:translate-x-0',
            s.drawer === 'inspector' ? 'translate-x-0' : 'translate-x-full',
            !side && 'lg:hidden',
          )}
        >
          <Inspector />
        </div>
      </div>
      <ExportDialog />
      <PresetDialog />
      <Dialog open={s.shortcutsOpen} onClose={() => s.setShortcutsOpen(false)} title={t('shortcuts')} width={440}>
        <dl className="divide-y divide-line">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 text-[13px]">
              <dt className="text-fg-2">{v}</dt>
              <dd className="flex gap-1">{k.split(', ').map((x) => <Kbd key={x}>{x}</Kbd>)}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
      <Toasts />
    </div>
  );
}

function Shell() {
  const route = useHashRoute();
  if (route === 'quality')
    return (
      <Suspense fallback={<div className="flex h-full items-center justify-center text-muted"><ArrowLeft size={16} /> Загрузка…</div>}>
        <QualityGallery />
      </Suspense>
    );
  return <Studio />;
}

export default function App() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}
