import { create } from 'zustand';
import type { Mode } from './domain/mode';

const MODE_KEY = 'tde.mode';

function validMode(value: unknown): value is Mode {
  return value === 'work' || value === 'personal';
}

function storedMode(): Mode {
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    return validMode(value) ? value : 'work';
  } catch {
    return 'work';
  }
}

const useModeStore = create<{ mode: Mode }>()(() => ({
  mode: typeof window === 'undefined' ? 'work' : storedMode(),
}));

export function useMode(): Mode {
  return useModeStore((state) => state.mode);
}

// For code outside React.
export function getMode(): Mode {
  return useModeStore.getState().mode;
}

export function setMode(mode: Mode): void {
  useModeStore.setState({ mode });
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // A blocked storage write does not prevent the switch in this tab.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === MODE_KEY) useModeStore.setState({ mode: validMode(event.newValue) ? event.newValue : 'work' });
  });
}
