import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Stub window and localStorage before mode-store is imported so listener registers. */
const { getStorageListener } = vi.hoisted(() => {
  let listener: ((event: { key: string; newValue: string | null }) => void) | undefined;
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    get localStorage() {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    },
    addEventListener: (type: string, cb: (event: { key: string; newValue: string | null }) => void) => {
      if (type === 'storage') listener = cb;
    },
  });
  return { getStorageListener: () => listener };
});

import { getMode, setMode } from './mode-store';

describe('mode store', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    });
    setMode('work');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    setMode('work');
  });

  it('defaults to work and can switch to personal and back', () => {
    expect(getMode()).toBe('work');
    setMode('personal');
    expect(getMode()).toBe('personal');
    expect(window.localStorage.getItem('tde.mode')).toBe('personal');

    setMode('work');
    expect(getMode()).toBe('work');
    expect(window.localStorage.getItem('tde.mode')).toBe('work');
  });

  it('updates store state when storage event fires from another tab', () => {
    const listener = getStorageListener();
    expect(listener).toBeDefined();
    if (!listener) throw new Error('storage listener was not registered');

    setMode('work');
    listener({
      key: 'tde.mode',
      newValue: 'personal',
    });
    expect(getMode()).toBe('personal');

    // Invalid mode in storage event falls back to work
    listener({
      key: 'tde.mode',
      newValue: 'invalid',
    });
    expect(getMode()).toBe('work');

    // Storage event for other keys is ignored
    setMode('personal');
    listener({
      key: 'other.key',
      newValue: 'work',
    });
    expect(getMode()).toBe('personal');
  });

  it('handles localStorage errors gracefully without throwing', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setMode('personal')).not.toThrow();
    expect(getMode()).toBe('personal');
  });
});
