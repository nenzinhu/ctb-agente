'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'ctb-reading-mode';
const EVENT = 'ctb-reading-mode-change';

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    document.documentElement.dataset.readingMode = event.newValue === 'scroll' ? 'scroll' : 'pages';
    listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
}

export function useScrollReading() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.readingMode === 'scroll', () => false);
}

export function setScrollReading(enabled: boolean) {
  const mode = enabled ? 'scroll' : 'pages';
  document.documentElement.dataset.readingMode = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* The session preference still works in private mode. */ }
  window.dispatchEvent(new Event(EVENT));
}
