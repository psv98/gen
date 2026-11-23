import { useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { readStore, writeStore } from '../lib/storage.ts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'subtle' | 'danger'; size?: 'sm' | 'md' };

export function Button({ variant = 'subtle', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[background,border-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-hi shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-6px_var(--accent)] hover:shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_8px_22px_-6px_var(--accent)]',
        variant === 'subtle' && 'bg-raised text-fg border border-line hover:border-line-strong hover:bg-panel-2',
        variant === 'ghost' && 'text-fg-2 hover:text-fg hover:bg-raised',
        variant === 'danger' && 'text-danger hover:bg-danger/10',
        className,
      )}
    />
  );
}

export function IconButton({ label, active, className, tipPos, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; tipPos?: 'top' | 'left' }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      data-tip-pos={tipPos}
      aria-pressed={active}
      {...p}
      className={cx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background,color,transform] duration-150 active:scale-90 disabled:opacity-35 disabled:pointer-events-none',
        active ? 'bg-accent-soft text-accent-hi' : 'text-fg-2 hover:bg-raised hover:text-fg',
        className,
      )}
    />
  );
}

export function Section({ id, title, children, actions }: { id: string; title: string; children: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(() => readStore(`section:${id}`, true));
  useEffect(() => writeStore(`section:${id}`, open), [id, open]);
  const bodyId = useId();
  return (
    <section className="border-b border-line">
      <div className="flex h-10 items-center pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex h-full flex-1 items-center gap-2 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-2 hover:text-fg"
        >
          <ChevronDown size={14} className={cx('transition-transform duration-150', !open && '-rotate-90')} />
          {title}
        </button>
        {actions}
      </div>
      <div id={bodyId} className={cx('grid transition-[grid-template-rows,opacity] duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px] text-muted">
        <label htmlFor={htmlFor}>{label}</label>
        {hint && <span className="text-[11px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function NumberInput({ value, onChange, min, max, step = 1, label, unit, className }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; unit?: string; className?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const v = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
    else setText(String(value));
  };
  return (
    <div className={cx('flex h-8 items-center rounded-md border border-line bg-panel-2 focus-within:border-accent', className)}>
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            onChange(Math.min(max, Math.max(min, Math.round((value + d) * 100) / 100)));
          }
        }}
        className="w-full min-w-0 bg-transparent px-2 font-mono text-[12px] text-fg outline-none"
      />
      {unit && <span className="pr-2 text-[11px] text-muted">{unit}</span>}
    </div>
  );
}

export function SliderField({ label, value, onChange, min, max, step = 1, unit, hint, softMax }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; hint?: string; softMax?: number }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            id={id}
            type="range"
            className="slider"
            min={min}
            max={max}
            step={step}
            value={value}
            style={{ ['--pct' as string]: `${pct}%` }}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
          {softMax !== undefined && softMax < max && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-[3px] h-[14px] w-px bg-cyan"
              style={{ left: `${((softMax - min) / (max - min)) * 100}%` }}
            />
          )}
        </div>
        <NumberInput label={label} value={value} onChange={onChange} min={min} max={max} step={step} unit={unit} className="w-[76px]" />
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg border border-line bg-panel-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={typeof o.label === 'string' ? undefined : o.title}
          title={typeof o.label === 'string' ? o.title : undefined}
          data-tip={typeof o.label === 'string' ? undefined : o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex h-7 items-center justify-center gap-1 rounded-md px-1.5 text-[12px] transition-[background,color,box-shadow] duration-150',
            value === o.value ? 'bg-raised text-fg shadow-sm ring-1 ring-line-strong' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] text-fg-2">
      <span className="cursor-pointer select-none" onClick={() => onChange(!checked)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx('relative inline-block h-5 w-9 shrink-0 rounded-full p-0 transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}
      >
        <span
          aria-hidden
          className={cx('absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-[cubic-bezier(.3,1.4,.5,1)]', checked ? 'translate-x-[18px]' : 'translate-x-0.5')}
        />
      </button>
    </div>
  );
}

export function ColorField({ label, value, onChange, swatches }: { label: string; value: string; onChange: (v: string) => void; swatches?: string[] }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (raw: string) => {
    let v = raw.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      if (v.length === 4) v = '#' + [...v.slice(1)].map((c) => c + c).join('');
      onChange(v.toUpperCase());
    } else setText(value);
  };
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label}: палитра`} className="swatch-input h-8 w-8 shrink-0 rounded-md ring-1 ring-line-strong" value={value.length === 7 ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <div className="flex h-8 flex-1 items-center rounded-md border border-line bg-panel-2 focus-within:border-accent">
          <span className="pl-2 font-mono text-[12px] text-muted">HEX</span>
          <input
            aria-label={`${label}: HEX`}
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
            className="w-full min-w-0 bg-transparent px-2 font-mono text-[12px] uppercase text-fg outline-none"
          />
        </div>
      </div>
      {swatches && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              data-tip={c}
              onClick={() => onChange(c)}
              className={cx('h-5 w-5 rounded-[5px] ring-1 ring-line-strong transition-transform hover:scale-110', value.toUpperCase() === c && 'ring-2 ring-accent')}
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </Field>
  );
}

export function Dialog({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>('input,button,select,[tabindex]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] anim-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="anim-pop max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-panel shadow-[var(--shadow)]" style={{ maxWidth: width }}>
        <div className="flex h-12 items-center justify-between border-b border-line pl-5 pr-2">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-panel-2 px-1 font-mono text-[10px] text-fg-2">{children}</kbd>;
}
