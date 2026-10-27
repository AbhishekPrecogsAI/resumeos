import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAutosave } from '../src/hooks/useAutosave.js';
import { ApiError } from '../src/api/client.js';

afterEach(() => vi.useRealTimers());

function setup(save, opts = {}) {
  vi.useFakeTimers();
  return renderHook(() =>
    useAutosave({ initialData: { n: 0 }, initialRevision: 1, save, delay: 500, ...opts }),
  );
}

describe('useAutosave', () => {
  it('debounces edits into one save with the current revision', async () => {
    const save = vi.fn(async (rev) => ({ revision: rev + 1 }));
    const { result } = setup(save);
    act(() => result.current.setData({ n: 1 }));
    act(() => result.current.setData({ n: 2 }));
    expect(result.current.status).toBe('pending');
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(1, { n: 2 });
    expect(result.current.status).toBe('saved');
    act(() => result.current.setData({ n: 3 }));
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(save).toHaveBeenLastCalledWith(2, { n: 3 });
  });

  it('saves again when edits arrive during a save', async () => {
    let release;
    const save = vi.fn(
      (rev) => new Promise((resolve) => (release = () => resolve({ revision: rev + 1 }))),
    );
    const { result } = setup(save);
    act(() => result.current.setData({ n: 1 }));
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(result.current.status).toBe('saving');
    act(() => result.current.setData({ n: 2 }));
    await act(async () => release());
    await act(async () => release());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual([2, { n: 2 }]);
    expect(result.current.status).toBe('saved');
  });

  it('reports conflicts without retrying and errors with retry', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'STALE_REVISION', 'stale'))
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
      .mockResolvedValue({ revision: 5 });
    const { result } = setup(save);
    act(() => result.current.setData({ n: 1 }));
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(result.current.status).toBe('conflict');
    expect(result.current.dirty).toBe(true);
    let ok;
    await act(async () => {
      ok = await result.current.overwrite(3);
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe('error');
    await act(async () => {
      ok = await result.current.retry();
    });
    expect(ok).toBe(true);
    expect(save).toHaveBeenLastCalledWith(3, { n: 1 });
    expect(result.current.status).toBe('saved');
  });

  it('undo and redo restore earlier states and coalesce typing', async () => {
    const save = vi.fn(async (rev) => ({ revision: rev + 1 }));
    const { result } = setup(save, { history: true });
    act(() => result.current.setData({ n: 1 }, { coalesceKey: 'field' }));
    act(() => result.current.setData({ n: 2 }, { coalesceKey: 'field' }));
    act(() => result.current.setData({ n: 3 }));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.data).toEqual({ n: 2 });
    act(() => result.current.undo());
    expect(result.current.data).toEqual({ n: 0 });
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.redo());
    expect(result.current.data).toEqual({ n: 2 });
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(save).toHaveBeenLastCalledWith(1, { n: 2 });
  });

  it('reset replaces local state with a server copy', async () => {
    const save = vi.fn(async (rev) => ({ revision: rev + 1 }));
    const { result } = setup(save);
    act(() => result.current.setData({ n: 1 }));
    act(() => result.current.reset({ n: 9 }, 7));
    expect(result.current.data).toEqual({ n: 9 });
    expect(result.current.status).toBe('saved');
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(save).not.toHaveBeenCalled();
  });
});
