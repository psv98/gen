import { useCallback, useRef, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Undo/redo stack. Rapid updates with the same `group` key (e.g. dragging a
 * slider) inside `coalesceMs` collapse into one history step.
 */
export function useHistory<T>(initial: T, limit = 100, coalesceMs = 600) {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });
  const last = useRef<{ group: string; at: number } | null>(null);

  const set = useCallback(
    (next: T | ((prev: T) => T), group = '') => {
      const now = Date.now();
      const coalesce = !!group && last.current?.group === group && now - last.current.at < coalesceMs;
      last.current = { group, at: now };
      setState((s) => {
        const value = typeof next === 'function' ? (next as (p: T) => T)(s.present) : next;
        if (Object.is(value, s.present)) return s;
        if (coalesce) return { past: s.past, present: value, future: [] };
        return { past: [...s.past, s.present].slice(-limit), present: value, future: [] };
      });
    },
    [coalesceMs, limit],
  );

  const undo = useCallback(() => {
    last.current = null;
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);
  const redo = useCallback(() => {
    last.current = null;
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  return { value: state.present, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
