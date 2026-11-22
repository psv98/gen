import { useMemo, useState } from 'react';
import { ArrowLeft, Sun, Moon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStudio } from '../../app/store.tsx';
import { categories, icons } from '../../lib/registry.ts';
import { categoryName, iconName } from '../../i18n/index.ts';
import { Segmented, cx } from '../../components/ui.tsx';
import report from '../../data/qa-report.json';

type Report = { generatedAt: string | null; summary: { errors: number; warnings: number; icons: number }; checks: { id: number; name: string; ok: boolean; problems: string[] }[]; icons: Record<string, string[]> };
const qa = report as Report;

function Glyph({ body, size, sw, color }: { body: string; size: number; sw: number; color: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: body }} />;
}

export default function QualityGallery() {
  const s = useStudio();
  const [cat, setCat] = useState(categories[0]?.id ?? '');
  const [mode, setMode] = useState<'sizes' | 'strokes'>('sizes');
  const [dark, setDark] = useState(false);
  const list = useMemo(() => icons.filter((i) => i.c === cat), [cat]);
  const fg = dark ? '#ECECF1' : '#141418';

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <a href="#" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-fg-2 hover:bg-raised hover:text-fg"><ArrowLeft size={15} />Студия</a>
        <h1 className="text-[14px] font-semibold">Icon Quality Gallery</h1>
        <span className="font-mono text-[12px] text-muted">{icons.length} иконок</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-56"><Segmented label="Режим" value={mode} onChange={setMode} options={[{ value: 'sizes', label: '16 · 24 · 32 · 64' }, { value: 'strokes', label: 'Толщины' }]} /></div>
          <button type="button" aria-label="Фон листа" onClick={() => setDark(!dark)} className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-2 hover:bg-raised">{dark ? <Moon size={15} /> : <Sun size={15} />}</button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-64 shrink-0 space-y-0.5 overflow-y-auto border-r border-line bg-panel p-2">
          {categories.map((c) => {
            const n = icons.filter((i) => i.c === c.id).length;
            const warn = icons.filter((i) => i.c === c.id && qa.icons[i.id]?.length).length;
            return (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-current={cat === c.id} className={cx('flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px]', cat === c.id ? 'bg-accent-soft text-fg' : 'text-fg-2 hover:bg-raised')}>
                <span className="truncate">{categoryName(c)}</span>
                {warn > 0 && <span className="ml-auto font-mono text-[10px] text-cyan">{warn}⚠</span>}
                <span className={cx('font-mono text-[11px]', warn ? '' : 'ml-auto', n === 50 ? 'text-ok' : 'text-danger')}>{n}</span>
              </button>
            );
          })}
          <div className="mt-4 space-y-1.5 border-t border-line px-2.5 pt-3 text-[12px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">validate-icons</div>
            {qa.generatedAt ? (
              <>
                <p className="text-fg-2">Отчёт от {qa.generatedAt}: ошибок <b className={qa.summary.errors ? 'text-danger' : 'text-ok'}>{qa.summary.errors}</b>, предупреждений <b>{qa.summary.warnings}</b>.</p>
                <ul className="space-y-1">
                  {qa.checks.map((c) => (
                    <li key={c.id} className="flex gap-1.5 text-[11px] leading-snug text-fg-2">
                      {c.ok ? <CheckCircle2 size={12} className="mt-px shrink-0 text-ok" /> : <AlertTriangle size={12} className="mt-px shrink-0 text-danger" />}
                      {c.id}. {c.name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted">Запустите npm run validate-icons, чтобы встроить отчёт.</p>
            )}
          </div>
        </nav>
        <main className={cx('min-h-0 flex-1 overflow-y-auto p-6', dark ? 'bg-[#101014]' : 'bg-white')}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {list.map((ic, n) => {
              const issues = qa.icons[ic.id] ?? [];
              return (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => { s.selectIcon(ic.id); window.location.hash = ''; }}
                  className={cx('rounded-xl border p-3 text-left transition-colors', dark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30')}
                  title="Открыть в студии"
                >
                  <div className="flex h-[72px] items-center justify-between gap-2">
                    {mode === 'sizes'
                      ? [16, 24, 32, 64].map((px) => <Glyph key={px} body={ic.b} size={px} sw={1.8} color={fg} />)
                      : [0.75, 1.8, ic.s[1], 3.5].map((sw, k) => (
                          <div key={k} className="flex flex-col items-center gap-1">
                            <Glyph body={ic.b} size={44} sw={sw} color={fg} />
                            <span className={cx('font-mono text-[9px]', k === 2 ? 'text-cyan' : dark ? 'text-white/40' : 'text-black/40')}>{sw}</span>
                          </div>
                        ))}
                  </div>
                  <div className={cx('mt-2 flex items-baseline gap-2 text-[12px]', dark ? 'text-white/80' : 'text-black/80')}>
                    <span className="font-mono text-[10px] opacity-50">{String(n + 1).padStart(2, '0')}</span>
                    <span className="truncate">{iconName(ic)}</span>
                    <span className="ml-auto font-mono text-[10px] opacity-50">≤{ic.s[1]}</span>
                  </div>
                  {issues.length > 0 && <p className="mt-1 text-[10px] leading-snug text-cyan">{issues.join('; ')}</p>}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
