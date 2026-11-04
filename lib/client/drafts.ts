'use client';
import { useEffect, useRef, useState } from 'react';
import { filterPII } from '@/lib/query/pii-filter';
const prefixo = 'ctb-rascunho-';
export function lerRascunho<T>(key: string): T | null {
  try { const raw = localStorage.getItem(prefixo + key); if (!raw) return null; if (raw.length > 30000) return null; const r = JSON.parse(raw); return r.schema === 1 && r.valor && typeof r.valor === 'object' && !Array.isArray(r.valor) ? r.valor as T : null; } catch { return null; }
}
export function salvarRascunho(key: string, valor: unknown): boolean {
  try { const raw = filterPII(JSON.stringify({ schema: 1, valor })); if (raw.length > 30000) return false; localStorage.setItem(prefixo + key, raw); return true; } catch { return false; }
}
export function removerRascunho(key: string): boolean { try { localStorage.removeItem(prefixo + key); return true; } catch { return false; } }
/** Only fields explicitly approved by each form are restored. No request/result is resumed. */
export function useDraftPersistence<T>(key: string, valor: T, restaurar: (v: T) => void) {
  const restore = useRef(restaurar); restore.current = restaurar;
  const [ready, setReady] = useState(false), [restored, setRestored] = useState(false), [available, setAvailable] = useState(true);
  const serialized = JSON.stringify(valor);
  useEffect(() => { const saved = lerRascunho<T>(key); if (saved) { restore.current(saved); setRestored(true); } setReady(true); }, [key]);
  useEffect(() => { if (ready) setAvailable(salvarRascunho(key, JSON.parse(serialized))); }, [key, serialized, ready]);
  return { ready, restored, available, clear: () => { removerRascunho(key); setRestored(false); } };
}
