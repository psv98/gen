import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHistory } from '../../src/lib/history.ts';

describe('useHistory', () => {
  it('undoes and redoes', () => {
    const { result } = renderHook(() => useHistory(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    expect(result.current.value).toBe(2);
    act(() => result.current.undo());
    expect(result.current.value).toBe(1);
    act(() => result.current.redo());
    expect(result.current.value).toBe(2);
  });
  it('coalesces rapid changes in the same group (slider drags)', () => {
    const { result } = renderHook(() => useHistory(0));
    act(() => result.current.set(1, 'w'));
    act(() => result.current.set(2, 'w'));
    act(() => result.current.set(3, 'w'));
    act(() => result.current.undo());
    expect(result.current.value).toBe(0);
  });
  it('clears redo stack after a new change', () => {
    const { result } = renderHook(() => useHistory('a'));
    act(() => result.current.set('b'));
    act(() => result.current.undo());
    act(() => result.current.set('c'));
    expect(result.current.canRedo).toBe(false);
  });
});
