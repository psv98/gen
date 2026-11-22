import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Maximize, Grid3x3, Columns2, Focus, SunMedium, Moon } from 'lucide-react';
import { useStudio } from '../../app/store.tsx';
import { composeSvg, iconTransform, DEFAULT_SETTINGS } from '../../lib/compose.ts';
import { IconButton, cx } from '../../components/ui.tsx';
import { t, iconName } from '../../i18n/index.ts';
import type { StudioSettings } from '../../types/index.ts';

const ZOOMS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

function GridOverlay({ s, w, h }: { s: StudioSettings; w: number; h: number }) {
  const { width: W, height: H, padding: P } = s.canvas;
  const lines = [];
  for (let i = 0; i <= 24; i++) {
    const strong = i === 0 || i === 24 || i === 12;
    lines.push(<path key={'v' + i} d={`M${i} 0V24`} stroke={strong ? 'var(--accent)' : 'var(--cyan)'} strokeOpacity={strong ? 0.55 : 0.16} vectorEffect="non-scaling-stroke" />);
    lines.push(<path key={'h' + i} d={`M0 ${i}H24`} stroke={strong ? 'var(--accent)' : 'var(--cyan)'} strokeOpacity={strong ? 0.55 : 0.16} vectorEffect="non-scaling-stroke" />);
  }
  return (
    <svg className="pointer-events-none absolute inset-0" width={w} height={h} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <rect x={P} y={P} width={Math.max(0, W - 2 * P)} height={Math.max(0, H - 2 * P)} fill="none" stroke="var(--cyan)" strokeOpacity="0.45" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <g transform={iconTransform(s)} fill="none" strokeWidth="1">
        {lines}
        <rect x="2" y="2" width="20" height="20" rx="1" stroke="var(--accent)" strokeOpacity="0.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

function Artboard({ svg, w, h, label, grid, s }: { svg: string; w: number; h: number; label?: string; grid: boolean; s: StudioSettings }) {
  const st = useStudio();
  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div
        className={cx('artboard relative shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 shadow-[0_8px_30px_rgb(0_0_0/0.25)] transition-[width,height] duration-150', st.checker === 'light' ? 'checker-light' : 'checker-dark')}
        style={{ width: w, height: h }}
        data-testid="artboard"
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        {grid && <GridOverlay s={s} w={w} h={h} />}
      </div>
      {label && <figcaption className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</figcaption>}
    </figure>
  );
}

export function CanvasView() {
  const s = useStudio();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 800, h: 600 });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const icon = s.selected;
  const set = s.settings;
  const { width: W, height: H } = set.canvas;
  const boards = s.compare ? 2 : 1;
  const fit = Math.max(0.05, Math.min((stage.w - 80 - (boards - 1) * 40) / (W * boards), (stage.h - 90) / H));
  const scale = s.zoom === 'fit' ? fit : s.zoom;
  const dw = Math.round(W * scale), dh = Math.round(H * scale);

  const svg = useMemo(() => (icon ? composeSvg(icon.b, set, { outWidth: dw, outHeight: dh, idPrefix: 'main' }) : ''), [icon, set, dw, dh]);
  const originalSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, canvas: { ...set.canvas, rotation: 0, flipX: false, flipY: false } }), [set.canvas]);
  const originalSvg = useMemo(() => (icon && s.compare ? composeSvg(icon.b, originalSettings, { outWidth: dw, outHeight: dh, idPrefix: 'orig' }) : ''), [icon, s.compare, originalSettings, dw, dh]);

  const zoomStep = (dir: 1 | -1) => {
    const cur = scale;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.001) : [...ZOOMS].reverse().find((z) => z < cur - 0.001);
    if (next) s.setZoom(next);
  };

  const sizes = [16, 24, 32, 48, 64];
  const small = useMemo(() => {
    if (!icon) return [];
    // Icon-only render at exact pixel sizes: current stroke, colour and orientation; no canvas padding or background.
    const bare: StudioSettings = { ...set, background: { ...set.background, type: 'none' }, shadow: { ...set.shadow, enabled: false }, canvas: { ...set.canvas, width: 24, height: 24, iconSize: 24, padding: 0, alignX: 'center', alignY: 'center' } };
    return sizes.map((px) => ({ px, svg: composeSvg(icon.b, bare, { outWidth: px, outHeight: px, idPrefix: 'p' + px }) }));
  }, [icon, set]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg" aria-label="Холст">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-3">
        <div className="min-w-0 flex-1 truncate text-[12px] text-muted">
          {icon && (
            <>
              <span className="text-fg">{iconName(icon)}</span>
              <span className="mx-2 text-line-strong">/</span>
              <span className="font-mono">{icon.id}</span>
              <span className="mx-2 text-line-strong">/</span>
              <span className="font-mono">{W}×{H}</span>
            </>
          )}
        </div>
        <IconButton label={`${t('zoomOut')} (−)`} onClick={() => zoomStep(-1)}><Minus size={15} /></IconButton>
        <button type="button" onClick={() => s.setZoom(1)} data-tip="100% (1)" className="h-8 w-14 rounded-lg font-mono text-[12px] text-fg-2 hover:bg-raised hover:text-fg" data-testid="zoom-level">
          {Math.round(scale * 100)}%
        </button>
        <IconButton label={`${t('zoomIn')} (+)`} onClick={() => zoomStep(1)}><Plus size={15} /></IconButton>
        <IconButton label={`${t('fit')} (0)`} active={s.zoom === 'fit'} onClick={() => s.setZoom('fit')}><Maximize size={15} /></IconButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <IconButton label={`${t('grid')} (G)`} active={s.showGrid} onClick={() => s.setShowGrid(!s.showGrid)}><Grid3x3 size={15} /></IconButton>
        <IconButton label={t('checker')} onClick={() => s.setChecker(s.checker === 'light' ? 'dark' : 'light')}>{s.checker === 'light' ? <SunMedium size={15} /> : <Moon size={15} />}</IconButton>
        <IconButton label={`${t('compare')} (C)`} active={s.compare} onClick={() => s.setCompare(!s.compare)}><Columns2 size={15} /></IconButton>
        <IconButton label={`${t('focus')} (F)`} active={s.focusMode} onClick={() => s.setFocusMode(!s.focusMode)} tipPos="left"><Focus size={15} /></IconButton>
      </div>

      <div
        ref={stageRef}
        className="stage-bg relative min-h-0 flex-1 overflow-auto"
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          zoomStep(e.deltaY < 0 ? 1 : -1);
        }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center gap-10 p-10" style={{ width: 'max-content', height: 'max-content', minWidth: '100%', minHeight: '100%' }}>
          {s.compare && <Artboard svg={originalSvg} w={dw} h={dh} label={t('original')} grid={false} s={originalSettings} />}
          <Artboard svg={svg} w={dw} h={dh} label={s.compare ? t('modified') : undefined} grid={s.showGrid} s={set} />
        </div>
      </div>

      <div className="flex h-[76px] shrink-0 items-center gap-5 overflow-x-auto border-t border-line bg-panel px-4" aria-label={t('previewSizes')}>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t('previewSizes')}</span>
        {small.map((p) => (
          <div key={p.px} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className={cx('flex h-[44px] w-[76px] items-center justify-center rounded-md', s.checker === 'light' ? 'bg-white' : 'bg-[#1b1b21]')} dangerouslySetInnerHTML={{ __html: p.svg }} />
            <span className="font-mono text-[10px] text-muted">{p.px}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
