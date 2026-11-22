import { useMemo, useState } from 'react';
import { Star, Copy, Image as ImageIcon, Download, FlipHorizontal2, FlipVertical2, Lock, Unlock, RotateCcw, Trash2, FolderPlus, Check, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Plus } from 'lucide-react';
import { useStudio } from '../../app/store.tsx';
import { BASE_STROKE, DEFAULT_SETTINGS, STROKE_LIMITS, canonicalSvg, cloneSettings, composeSvg } from '../../lib/compose.ts';
import { BACKGROUND_PRESETS, BUILT_IN_PRESETS, COLOR_SWATCHES } from '../../lib/presets.ts';
import { canCopyImage, copyPng, copyText, downloadBlob, svgBlob } from '../../lib/export.ts';
import { categoryById } from '../../lib/registry.ts';
import { categoryName, iconName, t } from '../../i18n/index.ts';
import { Button, ColorField, Field, IconButton, NumberInput, Section, Segmented, SliderField, Toggle, cx } from '../../components/ui.tsx';
import type { Align, Preset, StudioSettings } from '../../types/index.ts';

function PresetCard({ preset, body, onApply, onDelete }: { preset: Preset; body: string; onApply: () => void; onDelete?: () => void }) {
  const svg = useMemo(() => {
    const ps: StudioSettings = { ...preset.settings, canvas: { ...DEFAULT_SETTINGS.canvas, width: 96, height: 96, iconSize: 56, padding: 20 } };
    return composeSvg(body, ps, { outWidth: 44, outHeight: 44, idPrefix: 'pre-' + preset.id });
  }, [preset, body]);
  return (
    <div className="group relative">
      <button type="button" onClick={onApply} className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-line bg-panel-2 p-2 transition-colors hover:border-accent" aria-label={`Применить пресет ${preset.name}`}>
        <span className="checker-light flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-md" dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="w-full truncate text-center text-[11px] text-fg-2">{preset.name}</span>
      </button>
      {onDelete && (
        <button type="button" aria-label={`${t('delete')}: ${preset.name}`} onClick={onDelete} className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded bg-panel text-muted hover:text-danger group-hover:flex focus-visible:flex">
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

export function Inspector() {
  const s = useStudio();
  const icon = s.selected;
  const set = s.settings;
  const [colMenu, setColMenu] = useState(false);
  if (!icon) return null;
  const fav = s.favorites.includes(icon.id);
  const safeMax = icon.s[1];
  const cat = categoryById.get(icon.c);
  const { update } = s;

  const applyPreset = (p: Preset) => {
    s.setSettings((cur) => ({
      ...cur,
      stroke: { ...p.settings.stroke },
      background: { ...p.settings.background },
      shadow: { ...p.settings.shadow },
      canvas: p.builtIn ? cur.canvas : { ...p.settings.canvas },
    }));
    s.toast(`Пресет «${p.name}» применён`);
  };

  const setW = (w: number) => {
    const c = set.canvas;
    update('canvas', c.lockRatio ? { width: w, height: Math.max(16, Math.round((w * c.height) / c.width)) } : { width: w }, 'w');
  };
  const setH = (h: number) => {
    const c = set.canvas;
    update('canvas', c.lockRatio ? { height: h, width: Math.max(16, Math.round((h * c.width) / c.height)) } : { height: h }, 'h');
  };

  const copySvg = async () => {
    try { await copyText(composeSvg(icon.b, set, { idPrefix: icon.slug, title: icon.n[2] })); s.toast(t('copied') + ': SVG'); }
    catch { s.toast(t('copyFailed'), 'error'); }
  };
  const copyImage = async () => {
    if (!canCopyImage()) return s.toast(t('pngUnsupported'), 'error');
    try { await copyPng(icon.b, set, 512); s.toast(t('copied') + ': PNG 512 px'); }
    catch { s.toast(t('copyFailed'), 'error'); }
  };

  const alignOpts = (axis: 'x' | 'y') => [
    { value: 'start' as Align, label: axis === 'x' ? <AlignLeft size={14} /> : <AlignStartVertical size={14} />, title: axis === 'x' ? 'Слева' : 'Сверху' },
    { value: 'center' as Align, label: axis === 'x' ? <AlignCenter size={14} /> : <AlignCenterVertical size={14} />, title: 'По центру' },
    { value: 'end' as Align, label: axis === 'x' ? <AlignRight size={14} /> : <AlignEndVertical size={14} />, title: axis === 'x' ? 'Справа' : 'Снизу' },
  ];

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel" aria-label={t('inspector')}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Icon */}
        <section className="border-b border-line p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-fg">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={BASE_STROKE} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon.b }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14px] font-semibold leading-tight" data-testid="icon-title">{iconName(icon)}</h2>
              <p className="mt-0.5 truncate text-[12px] text-muted">{icon.n[2]} · {icon.n[1]}</p>
              <p className="mt-1 font-mono text-[11px] text-fg-2">{icon.id} · {icon.slug}</p>
            </div>
            <IconButton label={fav ? t('removeFavorite') : t('addFavorite')} active={fav} onClick={() => s.toggleFavorite(icon.id)} tipPos="left">
              <Star size={16} className={cx(fav && 'fill-current')} />
            </IconButton>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-fg-2">{icon.d}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent-hi">{categoryName(cat)}</span>
            {icon.t.map((tag) => <span key={tag} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">{tag}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Button size="sm" onClick={copySvg}><Copy size={13} />{t('copySvg')}</Button>
            <Button size="sm" onClick={copyImage} disabled={!canCopyImage()}><ImageIcon size={13} />{t('copyPng')}</Button>
            <Button size="sm" onClick={() => downloadBlob(svgBlob(canonicalSvg(icon.b)), `${icon.slug}.svg`)} data-tip="Исходный файл 24×24, currentColor"><Download size={13} />Оригинал</Button>
            <div className="relative">
              <Button size="sm" className="w-full" onClick={() => setColMenu((v) => !v)} aria-expanded={colMenu}><FolderPlus size={13} />{t('addToCollection')}</Button>
              {colMenu && (
                <div className="anim-pop absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-line bg-raised p-1 shadow-[var(--shadow)]" role="menu">
                  {s.collections.length === 0 && <p className="px-2 py-2 text-[12px] text-muted">Коллекций пока нет. Создайте её в библиотеке слева.</p>}
                  {s.collections.map((c) => {
                    const has = c.icons.includes(icon.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={has}
                        onClick={() => s.setCollections((cs) => cs.map((x) => (x.id === c.id ? { ...x, icons: has ? x.icons.filter((i) => i !== icon.id) : [...x.icons, icon.id] } : x)))}
                        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] hover:bg-panel-2"
                      >
                        <span className="flex h-4 w-4 items-center justify-center">{has && <Check size={13} className="text-accent-hi" />}</span>
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted">{c.icons.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <Section id="stroke" title={t('stroke')} actions={<IconButton label={t('reset')} className="h-7 w-7" onClick={() => update('stroke', DEFAULT_SETTINGS.stroke)}><RotateCcw size={13} /></IconButton>}>
          <SliderField
            label={t('strokeWidth')}
            value={set.stroke.width}
            min={STROKE_LIMITS[0]}
            max={STROKE_LIMITS[1]}
            step={0.05}
            softMax={safeMax}
            onChange={(v) => update('stroke', { width: v }, 'width')}
          />
          <p className="-mt-1 flex items-center gap-1.5 text-[11px] text-muted" title={t('safeRange')}><span className="inline-block h-2.5 w-px bg-cyan" />Проверено для иконки: <span className="font-mono text-fg-2">{icon.s[0]}–{safeMax}</span></p>
          {set.stroke.width > safeMax && (
            <p className="rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1.5 text-[11px] leading-snug text-fg-2" role="note">
              Выше проверенного значения {safeMax}: близкие линии этой иконки могут сливаться.
            </p>
          )}
          <ColorField label={t('color')} value={set.stroke.color} onChange={(v) => update('stroke', { color: v }, 'color')} swatches={COLOR_SWATCHES} />
          <Field label={t('linecap')}>
            <Segmented label={t('linecap')} value={set.stroke.linecap} onChange={(v) => update('stroke', { linecap: v })} options={[{ value: 'round', label: 'Round' }, { value: 'square', label: 'Square' }, { value: 'butt', label: 'Butt' }]} />
          </Field>
          <Field label={t('linejoin')}>
            <Segmented label={t('linejoin')} value={set.stroke.linejoin} onChange={(v) => update('stroke', { linejoin: v })} options={[{ value: 'round', label: 'Round' }, { value: 'miter', label: 'Miter' }, { value: 'bevel', label: 'Bevel' }]} />
          </Field>
        </Section>

        <Section id="background" title={t('background')} actions={<IconButton label={t('reset')} className="h-7 w-7" onClick={() => update('background', DEFAULT_SETTINGS.background)}><RotateCcw size={13} /></IconButton>}>
          <Segmented
            label={t('background')}
            value={set.background.type}
            onChange={(v) => update('background', { type: v })}
            options={[{ value: 'none', label: t('bgNone') }, { value: 'solid', label: t('bgSolid') }, { value: 'linear', label: 'Линейн.', title: t('bgLinear') }, { value: 'radial', label: 'Радиал.', title: t('bgRadial') }]}
          />
          {set.background.type !== 'none' && (
            <>
              <ColorField label={set.background.type === 'solid' ? t('color') : t('color1')} value={set.background.color} onChange={(v) => update('background', { color: v }, 'c1')} />
              {set.background.type !== 'solid' && <ColorField label={t('color2')} value={set.background.color2} onChange={(v) => update('background', { color2: v }, 'c2')} />}
              {set.background.type === 'linear' && <SliderField label={t('angle')} value={set.background.angle} min={0} max={360} unit="°" onChange={(v) => update('background', { angle: v }, 'angle')} />}
              <Field label={t('shape')}>
                <Segmented
                  label={t('shape')}
                  value={set.background.shape}
                  onChange={(v) => update('background', { shape: v })}
                  options={[{ value: 'square', label: t('shapeSquare') }, { value: 'rounded', label: t('shapeRounded') }, { value: 'circle', label: t('shapeCircle') }, { value: 'squircle', label: t('shapeSquircle') }]}
                />
              </Field>
              {(set.background.shape === 'rounded' || set.background.shape === 'squircle') && (
                <SliderField label={t('radius')} value={set.background.radius} min={0} max={50} unit="%" onChange={(v) => update('background', { radius: v }, 'radius')} />
              )}
            </>
          )}
          <div className="grid grid-cols-5 gap-1.5 pt-1" aria-label="Готовые фоны">
            {BACKGROUND_PRESETS.map((b) => (
              <button
                key={b.name}
                type="button"
                aria-label={b.name}
                data-tip={b.name}
                onClick={() => update('background', { type: b.type, color: b.color, color2: b.color2, ...(b.angle !== undefined ? { angle: b.angle } : {}) })}
                className="h-8 rounded-md ring-1 ring-line-strong transition-transform hover:scale-105"
                style={{ background: b.type === 'solid' ? b.color : b.type === 'linear' ? `linear-gradient(${b.angle}deg, ${b.color}, ${b.color2})` : `radial-gradient(circle, ${b.color}, ${b.color2})` }}
              />
            ))}
          </div>
        </Section>

        <Section id="canvas" title={t('canvas')} actions={<IconButton label={t('reset')} className="h-7 w-7" onClick={() => update('canvas', DEFAULT_SETTINGS.canvas)}><RotateCcw size={13} /></IconButton>}>
          <div className="flex items-end gap-2">
            <Field label={t('width')}><NumberInput label={t('width')} value={set.canvas.width} min={16} max={4096} onChange={setW} unit="px" /></Field>
            <IconButton label={t('lockRatio')} active={set.canvas.lockRatio} onClick={() => update('canvas', { lockRatio: !set.canvas.lockRatio })} className="mb-0">
              {set.canvas.lockRatio ? <Lock size={14} /> : <Unlock size={14} />}
            </IconButton>
            <Field label={t('height')}><NumberInput label={t('height')} value={set.canvas.height} min={16} max={4096} onChange={setH} unit="px" /></Field>
          </div>
          <SliderField label={t('iconSize')} value={set.canvas.iconSize} min={8} max={Math.max(set.canvas.width, set.canvas.height)} unit="px" onChange={(v) => update('canvas', { iconSize: v }, 'size')} />
          <SliderField label={t('padding')} value={set.canvas.padding} min={0} max={Math.floor(Math.min(set.canvas.width, set.canvas.height) / 2)} unit="px" onChange={(v) => update('canvas', { padding: v }, 'pad')} />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('alignX')}><Segmented label={t('alignX')} value={set.canvas.alignX} onChange={(v) => update('canvas', { alignX: v })} options={alignOpts('x')} /></Field>
            <Field label={t('alignY')}><Segmented label={t('alignY')} value={set.canvas.alignY} onChange={(v) => update('canvas', { alignY: v })} options={alignOpts('y')} /></Field>
          </div>
          <SliderField label={t('rotation')} value={set.canvas.rotation} min={-180} max={180} unit="°" onChange={(v) => update('canvas', { rotation: v }, 'rot')} />
          <div className="flex gap-1.5">
            <Button size="sm" className={cx('flex-1', set.canvas.flipX && 'border-accent text-accent-hi')} aria-pressed={set.canvas.flipX} onClick={() => update('canvas', { flipX: !set.canvas.flipX })}><FlipHorizontal2 size={14} />Гориз.</Button>
            <Button size="sm" className={cx('flex-1', set.canvas.flipY && 'border-accent text-accent-hi')} aria-pressed={set.canvas.flipY} onClick={() => update('canvas', { flipY: !set.canvas.flipY })}><FlipVertical2 size={14} />Верт.</Button>
          </div>
        </Section>

        <Section id="effects" title={t('effects')}>
          <Toggle label={t('shadow')} checked={set.shadow.enabled} onChange={(v) => update('shadow', { enabled: v })} />
          {set.shadow.enabled && (
            <>
              <ColorField label={t('color')} value={set.shadow.color} onChange={(v) => update('shadow', { color: v }, 'c')} />
              <SliderField label={t('blur')} value={set.shadow.blur} min={0} max={64} unit="px" onChange={(v) => update('shadow', { blur: v }, 'blur')} />
              <SliderField label={t('opacity')} value={Math.round(set.shadow.opacity * 100)} min={0} max={100} unit="%" onChange={(v) => update('shadow', { opacity: v / 100 }, 'op')} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('offsetX')}><NumberInput label={t('offsetX')} value={set.shadow.x} min={-128} max={128} onChange={(v) => update('shadow', { x: v }, 'x')} unit="px" /></Field>
                <Field label={t('offsetY')}><NumberInput label={t('offsetY')} value={set.shadow.y} min={-128} max={128} onChange={(v) => update('shadow', { y: v }, 'y')} unit="px" /></Field>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{t('shadowNote')}</p>
            </>
          )}
        </Section>

        <Section id="presets" title={t('presets')} actions={<IconButton label={t('savePreset')} className="h-7 w-7" onClick={() => s.setPresetDialog(true)}><Plus size={14} /></IconButton>}>
          <div className="text-[11px] font-medium text-muted">{t('builtIn')}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {BUILT_IN_PRESETS.map((p) => <PresetCard key={p.id} preset={p} body={icon.b} onApply={() => applyPreset(p)} />)}
          </div>
          <div className="pt-1 text-[11px] font-medium text-muted">{t('custom')}</div>
          {s.customPresets.length ? (
            <div className="grid grid-cols-4 gap-1.5">
              {s.customPresets.map((p) => <PresetCard key={p.id} preset={p} body={icon.b} onApply={() => applyPreset(p)} onDelete={() => s.setCustomPresets((ps) => ps.filter((x) => x.id !== p.id))} />)}
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted">{t('noCustom')}</p>
          )}
        </Section>
      </div>
      <div className="border-t border-line p-3">
        <Button className="w-full" onClick={() => s.setSettings(cloneSettings(DEFAULT_SETTINGS))}><RotateCcw size={14} />{t('resetAll')}</Button>
      </div>
    </aside>
  );
}
