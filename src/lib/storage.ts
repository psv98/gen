import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'icon-studio:';

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota) — keep working in memory */
  }
}

/** useState mirrored to localStorage. */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));
  useEffect(() => writeStore(key, value), [key, value]);
  const reset = useCallback(() => setValue(fallback), [fallback]);
  return [value, setValue, reset] as const;
}
