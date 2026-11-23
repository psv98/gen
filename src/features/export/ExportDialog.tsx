import { useEffect, useState } from 'react';
import { Download, Copy, Info } from 'lucide-react';
import { useStudio } from '../../app/store.tsx';
import { Button, ColorField, Dialog, Field, NumberInput, Segmented, SliderField, Toggle, cx } from '../../components/ui.tsx';
import { MAX_RASTER, RASTER_SIZES, copyText, exportSprite, downloadBlob, exportOne, exportZip, fileName, outputSize, type ExportFormat, type ExportOptions } from '../../lib/export.ts';
import { composeSvg } from '../../lib/compose.ts';
import { iconById } from '../../lib/registry.ts';
import { readStore, writeStore } from '../../lib/storage.ts';
import { t } from '../../i18n/index.ts';

const DEFAULT_OPTS: ExportOptions = { format: 'png', size: 1024, quality: 0.92, matte: '#FFFFFF', useCurrentColor: false };

export function ExportDialog() {
  const s = useStudio();
  const [o, setO] = useState<ExportOptions>(() => ({ ...DEFAULT_OPTS, ...readStore('export', {}) }));
  const [custom, setCustom] = useState(() => !RASTER_SIZES.includes(o.size));
  const [scope, setScope] = useState<'current' | 'batch'>('current');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => writeStore('export', o), [o]);
  useEffect(() => { if (s.exportOpen) setScope(s.selectMode && s.selection.length ? 'batch' : 'current'); }, [s.exportOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (scope === 'current' && o.format === 'sprite') setO((x) => ({ ...x, format: 'svg' })); }, [scope, o.format]);

  const icon = s.selected;
  if (!icon) return null;
  const set = s.settings;
  const batch = s.selection.map((id) => iconById.get(id)).filter((x) => !!x);
  const { w, h } = outputSize(set, o.size);
  const patch = (p: Partial<ExportOptions>) => setO((x) => ({ ...x, ...p }));

  const run = async () => {
    try {
      if (scope === 'batch' && batch.length && o.format === 'sprite') {
        downloadBlob(exportSprite(batch, set, o.useCurrentColor), `icon-sprite-${batch.length}.svg`);
        s.toast(`${t('exported')}: SVG-спрайт, ${batch.length} шт.`);
      } else if (scope === 'batch' && batch.length) {
        setBusy(`0 / ${batch.length}`);
        const zip = await exportZip(batch, set, o, (d, n) => setBusy(`${d} / ${n}`));
        downloadBlob(zip, `icon-studio-${batch.length}-icons-${o.format}.zip`);
        s.toast(`${t('exported')}: ZIP, ${batch.length} шт.`);
      } else {
        setBusy('…');
        downloadBlob(await exportOne(icon, set, o), fileName(icon, o, set));
        s.toast(`${t('exported')}: ${fileName(icon, o, set)}`);
      }
      s.setExportOpen(false);
    } catch (e) {
      s.toast(`Ошибка экспорта: ${(e as Error).message}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={s.exportOpen} onClose={() => !busy && s.setExportOpen(false)} title={t('exportTitle')} width={520}>
      <div className="space-y-4">
        <Field label={t('scope')}>
          <Segmented
            label={t('scope')}
            value={scope}
            onChange={setScope}
            options={[{ value: 'current', label: t('scopeCurrent') }, { value: 'batch', label: `${t('scopeBatch')} (${batch.length})` }]}
          />
        </Field>
        {scope === 'batch' && (
          <p className={cx('flex gap-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed', batch.length ? 'border-line bg-panel-2 text-fg-2' : 'border-danger/40 bg-danger/10 text-fg')}>
            <Info size={14} className="mt-0.5 shrink-0 text-muted" />
            {batch.length ? t('batchHint') : 'Нет выбранных иконок. Включите «Выбор нескольких» в библиотеке или кликайте по иконкам с Ctrl / ⌘ / Shift.'}
          </p>
        )}
        <Field label={t('format')}>
          <Segmented<ExportFormat> label={t('format')} value={o.format} onChange={(v) => patch({ format: v })} options={[{ value: 'svg', label: 'SVG' }, { value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, ...(scope === 'batch' ? [{ value: 'sprite' as ExportFormat, label: 'Спрайт', title: 'Один SVG-файл с <symbol> для каждой иконки' }] : [])]} />
        </Field>

        {o.format === 'svg' || o.format === 'sprite' ? (
          <div className="space-y-3">
            <Toggle label={t('useCurrentColor')} checked={o.useCurrentColor} onChange={(v) => patch({ useCurrentColor: v })} />
            <p className="text-[12px] text-muted">{o.format === 'sprite' ? <>Иконки собираются в один файл с элементами &lt;symbol&gt;. Подключение: <code className="font-mono text-fg-2">&lt;svg&gt;&lt;use href="sprite.svg#slug"/&gt;&lt;/svg&gt;</code>. Фон и тень в спрайт не входят.</> : <>{t('currentColorHint')} Размер документа: {set.canvas.width}×{set.canvas.height}, геометрия и обводки остаются векторными.</>}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t('size')} hint={`${w} × ${h} px`}>
              <div className="flex flex-wrap gap-1">
                {RASTER_SIZES.map((px) => (
                  <button key={px} type="button" aria-pressed={!custom && o.size === px} onClick={() => { setCustom(false); patch({ size: px }); }} className={cx('h-7 rounded-md border px-2 font-mono text-[12px] transition-colors', !custom && o.size === px ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg-2 hover:border-line-strong')}>
                    {px}
                  </button>
                ))}
                <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cx('h-7 rounded-md border px-2 text-[12px] transition-colors', custom ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg-2 hover:border-line-strong')}>
                  {t('customSize')}
                </button>
              </div>
              {custom && <NumberInput className="mt-2 w-40" label={t('customSize')} value={o.size} min={8} max={MAX_RASTER} onChange={(v) => patch({ size: Math.round(v) })} unit="px" />}
            </Field>
            {o.format === 'jpeg' && (
              <>
                <SliderField label={t('jpegQuality')} value={Math.round(o.quality * 100)} min={10} max={100} unit="%" onChange={(v) => patch({ quality: v / 100 })} />
                <ColorField label={t('matte')} value={o.matte} onChange={(v) => patch({ matte: v })} />
                <p className="text-[12px] text-muted">{t('matteHint')}</p>
              </>
            )}
            {o.format === 'png' && <p className="text-[12px] text-muted">PNG сохраняет прозрачность. Растр строится из векторной геометрии в целевом разрешении.</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {o.format === 'svg' && scope === 'current' && (
            <Button
              onClick={async () => {
                try { await copyText(composeSvg(icon.b, set, { idPrefix: icon.slug, useCurrentColor: o.useCurrentColor, title: icon.n[2] })); s.toast(t('copied') + ': SVG'); }
                catch { s.toast(t('copyFailed'), 'error'); }
              }}
            >
              <Copy size={14} />{t('copySvg')}
            </Button>
          )}
          <Button variant="primary" onClick={run} disabled={!!busy || (scope === 'batch' && !batch.length)} data-testid="export-download">
            <Download size={14} />
            {busy ? `${t('exporting')} ${busy}` : t('download')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
