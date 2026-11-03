'use client';

import { useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/client/request';
import type { Colecao } from '@/lib/ingestion/documents';

interface Metadata {
  colecao: Colecao;
  normaId?: string;
  documentType?: string;
  titulo?: string;
  fonteOficial: string;
  versao: string;
  vigenteDesde: string;
  conferidoEm: string;
}
interface Entry { name: string; path: string; folder: boolean; supported: boolean }
interface Listing { entries: Entry[]; hasMore: boolean }
interface Result { success?: boolean; duplicado?: boolean; message?: string; data?: { insertedCount?: number; failedCount?: number; semVetor?: number } }

export default function StorageImport({ metadata, disabled, onComplete, onBusyChange }: { metadata: Metadata; disabled: boolean; onComplete?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const [prefix, setPrefix] = useState('');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const setLoading = (value: boolean) => { setBusy(value); onBusyChange?.(value); };
  useEffect(() => () => controller.current?.abort(), []);
  const file = entries?.find(entry => entry.path === selected && !entry.folder);
  const deliberation = Boolean(file && /delibera/i.test(file.name));

  const list = async (folder = prefix) => {
    if (busy || disabled) return;
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    setLoading(true); setError(null); setNotice(null); setSelected('');
    try {
      const result = await requestJson<Listing>(`/api/admin/documents/storage-files?prefix=${encodeURIComponent(folder)}`, { signal: active.signal });
      if (!Array.isArray(result.entries)) throw new Error('O serviço retornou uma lista inválida.');
      setPrefix(folder); setEntries(result.entries);
      if (result.hasMore) setNotice('A pasta tem mais de 1.000 itens. Abra uma subpasta para localizar o documento.');
    } catch (cause) { if (!active.signal.aborted) { setEntries(null); setError(cause instanceof Error ? cause.message : 'Não foi possível listar os arquivos.'); } }
    finally { if (!active.signal.aborted) setLoading(false); }
  };

  const importFile = async () => {
    if (!file || busy || disabled || deliberation) return;
    if ((metadata.colecao === 'ctb' && !metadata.normaId?.trim()) || !metadata.fonteOficial.trim() || !metadata.versao.trim() || !metadata.vigenteDesde || !metadata.conferidoEm) {
      setError('Preencha norma, fonte, versão, vigência e conferência nos campos acima antes de importar.'); return;
    }
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    setLoading(true); setError(null); setNotice(null);
    try {
      const result = await requestJson<Result>('/api/ingestion/upload', {
        method: 'POST', signal: active.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metadata, storagePath: file.path, fileName: file.name, dataVigenciaInicio: `${metadata.vigenteDesde}T00:00:00.000Z`, preserveStorageFile: true, situacao: 'revisar' }),
      }, 75000);
      if (!result.success) throw new Error('A importação não foi confirmada pelo servidor.');
      const failed = result.data?.failedCount ?? 0;
      const vectors = result.data?.semVetor ?? 0;
      setNotice(result.duplicado ? 'Este documento já está indexado. O PDF foi preservado no Storage.' : `${result.data?.insertedCount ?? 0} trecho(s) importado(s).${failed ? ` Importação parcial: ${failed} trecho(s) falharam; confira a revisão da base.` : ''} ${vectors ? `${vectors} trecho(s) sem vetor; gere os vetores pendentes na lista de documentos. ` : ''}O PDF foi preservado no Storage. Confira a cobertura dos anexos antes de usar na fiscalização.`);
      onComplete?.();
    } catch (cause) { if (!active.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível importar o documento.'); }
    finally { if (!active.signal.aborted) setLoading(false); }
  };

  return <section className="rounded-control border border-ds-line p-4 space-y-3" aria-label="Importar do Supabase" aria-busy={busy}>
    <h3 className="font-semibold text-ds-text">Importar arquivos já no Supabase</h3>
    <p className="text-sm text-ds-subtle">Bucket: <strong>documentos-pendentes</strong>. Use os dados da norma preenchidos acima. Os originais serão preservados.</p>
    <label className="block"><span className="label">Pasta no bucket (opcional)</span><input className="input" value={prefix} onChange={event => { setPrefix(event.target.value); setEntries(null); setSelected(''); }} placeholder="Vazio para a raiz; exemplo: originais" disabled={busy || disabled} /></label>
    <button type="button" className="btn-secondary" disabled={busy || disabled} onClick={() => list()}>{busy ? 'Aguarde…' : 'Listar arquivos do Supabase'}</button>
    {entries && <>
      {prefix && <button type="button" className="btn-ghost btn-sm" disabled={busy || disabled} onClick={() => list(prefix.split('/').slice(0, -1).join('/'))}>Voltar à pasta anterior</button>}
      {entries.filter(entry => entry.folder).map(folder => <button key={folder.path} type="button" className="btn-secondary mr-2 mb-2" disabled={busy || disabled} onClick={() => list(folder.path)}>Abrir pasta {folder.name}</button>)}
      {!entries.some(entry => !entry.folder) && <p role="status" className="text-sm text-ds-subtle">Nenhum arquivo nesta pasta. Abra uma subpasta, se houver.</p>}
      {entries.some(entry => !entry.folder) && <label className="block"><span className="label">Arquivo no Storage</span><select className="input" value={selected} onChange={event => setSelected(event.target.value)} disabled={busy || disabled}><option value="">Selecione um documento</option>{entries.filter(entry => !entry.folder).map(entry => <option key={entry.path} value={entry.path} disabled={!entry.supported}>{entry.name}{entry.supported ? '' : ' — formato não suportado'}</option>)}</select></label>}
      {entries.some(entry => /\.zip$/i.test(entry.name)) && <p className="hint">Arquivos ZIP precisam ser descompactados: envie os PDFs individuais ao bucket.</p>}
      {deliberation && <p className="hint">O cadastro ainda não suporta o tipo Deliberação. Mantenha este arquivo no Storage até o tipo estar disponível.</p>}
      <p className="hint">PDFs com anexos em imagem precisam de OCR ou transcrição conferida. A importação do texto não substitui automaticamente as fichas antigas.</p>
      <button type="button" className="btn-primary" disabled={!file || !file.supported || deliberation || busy || disabled} onClick={importFile}>{busy ? 'Importando…' : 'Importar documento selecionado'}</button>
    </>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {notice && <p className="text-sm text-ds-subtle" role="status">{notice}</p>}
  </section>;
}
