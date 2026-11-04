import { pacoteValido, type PacoteOffline, type PacoteSalvo } from './model';
const DB = 'ctb-acervo-offline-v1';
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('O armazenamento offline não está disponível neste navegador.'));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pacotes');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível acessar o pacote offline.'));
    request.onblocked = () => reject(new Error('Feche outras abas do aplicativo e tente novamente.'));
  });
}
export async function lerPacote(chave: 'atual' | 'anterior' = 'atual'): Promise<PacoteSalvo | null> {
  const db = await abrir();
  try { return await new Promise((resolve, reject) => {
    const r = db.transaction('pacotes').objectStore('pacotes').get(chave);
    r.onsuccess = () => resolve(r.result && pacoteValido(r.result.pacote) && typeof r.result.baixadoEm === 'string' ? r.result : null);
    r.onerror = () => reject(new Error('Não foi possível ler o pacote offline.'));
  }); } finally { db.close(); }
}
export async function salvarPacote(pacote: PacoteOffline): Promise<PacoteSalvo> {
  if (!pacoteValido(pacote)) throw new Error('O pacote recebido é inválido. O acervo anterior foi preservado.');
  const db = await abrir();
  const registro = { pacote, baixadoEm: new Date().toISOString() };
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pacotes', 'readwrite'), store = tx.objectStore('pacotes');
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Sem espaço ou permissão para salvar. O pacote anterior foi preservado.'));
    const r = store.get('atual');
    r.onsuccess = () => {
      if (r.result && pacoteValido(r.result.pacote) && r.result.pacote.versao !== pacote.versao) store.put(r.result, 'anterior');
      store.put(registro, 'atual');
    };
  }); return registro; } finally { db.close(); }
}
export async function removerPacotes() {
  const db = await abrir();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('pacotes', 'readwrite'); tx.objectStore('pacotes').clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Não foi possível remover o pacote.')); }); } finally { db.close(); }
}
