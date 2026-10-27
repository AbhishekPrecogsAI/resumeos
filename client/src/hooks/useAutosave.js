import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client.js';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 800;

/**
 * Autosave for a revision-checked document.
 *
 * - Edits update local state immediately and save after `delay` ms of quiet.
 * - Only one save is in flight; edits made during a save trigger another save afterwards.
 * - 409 → status 'conflict' (nothing is overwritten); other failures → 'error' with retry().
 * - flush()/retry() resolve to true when everything is saved, false when the save failed.
 * - Optional undo/redo history; rapid edits with the same `coalesceKey` merge into one step.
 */
export function useAutosave({ initialData, initialRevision, save, delay = 1000, history = false }) {
  const [data, setDataState] = useState(initialData);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [historyState, setHistoryState] = useState({ past: [], future: [] });

  const dataRef = useRef(initialData);
  const revisionRef = useRef(initialRevision);
  const savedDataRef = useRef(initialData);
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const saveRef = useRef(save);
  const lastEditRef = useRef({ key: null, at: 0 });

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const runSave = useCallback(() => {
    clearTimeout(timerRef.current);
    if (inFlightRef.current) return inFlightRef.current;
    if (dataRef.current === savedDataRef.current) {
      setStatus('saved');
      return Promise.resolve(true);
    }
    setStatus('saving');
    setError(null);
    const promise = (async () => {
      try {
        // Keep saving until the server has the latest local state (edits can land mid-save).
        while (dataRef.current !== savedDataRef.current) {
          const snapshot = dataRef.current;
          const result = await saveRef.current(revisionRef.current, snapshot);
          revisionRef.current = result.revision;
          savedDataRef.current = snapshot;
          setLastSavedAt(new Date());
        }
        setStatus('saved');
        return true;
      } catch (err) {
        setError(err);
        setStatus(err instanceof ApiError && err.status === 409 ? 'conflict' : 'error');
        return false;
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = promise;
    return promise;
  }, []);

  const schedule = useCallback(() => {
    clearTimeout(timerRef.current);
    setStatus((s) => (s === 'conflict' ? s : 'pending'));
    timerRef.current = setTimeout(() => {
      runSave();
    }, delay);
  }, [delay, runSave]);

  const setData = useCallback(
    (updater, { coalesceKey = null } = {}) => {
      const prev = dataRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return;
      dataRef.current = next;
      setDataState(next);
      if (history) {
        const now = Date.now();
        const merge =
          coalesceKey &&
          lastEditRef.current.key === coalesceKey &&
          now - lastEditRef.current.at < COALESCE_MS;
        lastEditRef.current = { key: coalesceKey, at: now };
        if (!merge)
          setHistoryState((h) => ({
            past: [...h.past.slice(-HISTORY_LIMIT + 1), prev],
            future: [],
          }));
        else setHistoryState((h) => ({ ...h, future: [] }));
      }
      schedule();
    },
    [history, schedule],
  );

  const jump = useCallback(
    (direction) => {
      setHistoryState((h) => {
        const from = direction === 'undo' ? h.past : h.future;
        if (!from.length) return h;
        const target = from[from.length - 1];
        const current = dataRef.current;
        dataRef.current = target;
        setDataState(target);
        lastEditRef.current = { key: null, at: 0 };
        schedule();
        return direction === 'undo'
          ? { past: h.past.slice(0, -1), future: [...h.future, current] }
          : { past: [...h.past, current], future: h.future.slice(0, -1) };
      });
    },
    [schedule],
  );

  /** Replace local state with a fresh server copy (used after a conflict). */
  const reset = useCallback((freshData, freshRevision) => {
    clearTimeout(timerRef.current);
    dataRef.current = freshData;
    savedDataRef.current = freshData;
    revisionRef.current = freshRevision;
    setDataState(freshData);
    setHistoryState({ past: [], future: [] });
    setStatus('saved');
    setError(null);
  }, []);

  /** Keep local edits but retry against the latest revision (explicit "keep mine"). */
  const overwrite = useCallback(
    (latestRevision) => {
      revisionRef.current = latestRevision;
      savedDataRef.current = null;
      return runSave();
    },
    [runSave],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const undo = useCallback(() => jump('undo'), [jump]);
  const redo = useCallback(() => jump('redo'), [jump]);

  const dirty =
    status === 'pending' || status === 'saving' || status === 'error' || status === 'conflict';

  return {
    data,
    setData,
    status,
    error,
    dirty,
    lastSavedAt,
    flush: runSave,
    retry: runSave,
    reset,
    overwrite,
    undo,
    redo,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  };
}
