'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Colecao, DocumentoRegistro, DocumentosResposta, GrupoLegado } from '@/lib/ingestion/documents';
import Icone from './ui/Icone';

/**
 * Indexed documents of one collection: one row per uploaded file, with the
 * actions that keep the base healthy (delete, legacy cleanup, vectors).
 */

interface DocumentListProps {
  colecao: Colecao;
  refreshTrigger?: number;
  /** Called after anything that changes the base (delete). */
  onChange?: () => void;
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
}

const FORMATO_ROTULO: Record<string, string> = { pdf: 'PDF', docx: 'DOCX', doc: 'DOC', md: 'MD', txt: 'TXT' };

export default function DocumentList({ colecao, refreshTrigger, onChange }: DocumentListProps) {
  const [dados, setDados] = useState<DocumentosResposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [vetores, setVetores] = useState<{ rodando: boolean; mensagem: string | null }>({ rodando: false, mensagem: null });

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const resposta = await fetch(`/api/admin/documents?colecao=${colecao}`);
      if (!resposta.ok) throw new Error();
      setDados((await resposta.json()) as DocumentosResposta);
    } catch {
      setErro('Não foi possível carregar os documentos.');
    }
  }, [colecao]);

  useEffect(() => {
    void carregar();
  }, [carregar, refreshTrigger]);

  const excluir = async (alvo: { id: string; titulo: string } | GrupoLegado) => {
    const ehDocumento = 'id' in alvo;
    const nome = ehDocumento ? `"${alvo.titulo}"` : `os ${alvo.trechos} trechos antigos de "${alvo.norma_id}"`;
    if (!window.confirm(`Excluir ${nome} da base? As consultas deixam de usar esse conteúdo.`)) return;

    const chave = ehDocumento ? alvo.id : `legado:${alvo.norma_id}:${alvo.tipo}`;
    setOcupado(chave);
    setAviso(null);
    try {
      const query = ehDocumento
        ? `id=${encodeURIComponent(alvo.id)}`
        : `legado=${encodeURIComponent(alvo.norma_id)}&tipo=${encodeURIComponent(alvo.tipo)}`;
      const resposta = await fetch(`/api/admin/documents?${query}`, { method: 'DELETE' });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.message || corpo.error || 'Falha ao excluir.');
      setAviso(`${ehDocumento ? alvo.titulo : `Trechos antigos de ${alvo.norma_id}`} excluído(s).`);
      await carregar();
      onChange?.();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'Falha ao excluir.');
    } finally {
      setOcupado(null);
    }
  };

  const gerarVetores = async () => {
    setVetores({ rodando: true, mensagem: 'Gerando vetores…' });
    let total = 0;
    try {
      // Each call works ~40s; loop until nothing is left.
      for (let rodada = 0; rodada < 50; rodada++) {
        const resposta = await fetch('/api/admin/documents/vetores', { method: 'POST' });
        const corpo = await resposta.json().catch(() => ({}));
        total += Number(corpo.atualizados ?? 0);
        if (!resposta.ok) throw new Error(corpo.message || corpo.erro || 'Falha ao gerar vetores.');
        setVetores({ rodando: true, mensagem: `${total} vetor(es) gerado(s) · faltam ${corpo.restantes}` });
        if (!corpo.restantes || Number(corpo.atualizados ?? 0) === 0) break;
      }
      setVetores({ rodando: false, mensagem: `${total} vetor(es) gerado(s).` });
    } catch (error) {
      setVetores({ rodando: false, mensagem: error instanceof Error ? error.message : 'Falha ao gerar vetores.' });
    } finally {
      await carregar();
    }
  };

  if (erro) {
    return (
      <div className="alert-error" role="alert">
        <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
        <p>{erro}</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="space-y-2" role="status">
        <span className="sr-only">Carregando documentos…</span>
        <div className="skeleton h-14" />
        <div className="skeleton h-14" />
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();
  const documentos: DocumentoRegistro[] = termo
    ? dados.documentos.filter((d) => `${d.titulo} ${d.nome_arquivo} ${d.norma_id ?? ''}`.toLowerCase().includes(termo))
    : dados.documentos;

  return (
    <div className="space-y-4">
      {!dados.bancoConfigurado && (
        <div className="alert-warn">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-warn" />
          <p>
            <strong>Banco de dados não configurado.</strong> Defina <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> e aplique as migrations em{' '}
            <code>scripts/</code>.
          </p>
        </div>
      )}

      {dados.migracaoPendente && (
        <div className="alert-warn">
          <Icone nome="base" className="mt-0.5 shrink-0 text-ds-warn" />
          <p>
            <strong>Falta a migration 008.</strong> Rode <code>scripts/migrations-008-rag-indexacao.sql</code> no SQL Editor
            do Supabase para listar e gerenciar documentos, corrigir a busca e habilitar a base de POPs.
          </p>
        </div>
      )}

      {dados.pendentesVetor > 0 && (
        <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Icone nome="faisca" className="shrink-0 text-ds-primary" />
          <p className="flex-1 text-sm text-ds-text">
            <strong>{dados.pendentesVetor} trecho(s) sem vetor semântico.</strong>{' '}
            <span className="text-ds-subtle">
              A busca por palavras já os encontra; os vetores ajudam perguntas feitas com outras palavras.
            </span>
            {vetores.mensagem && <span className="mt-1 block text-xs text-ds-subtle" role="status">{vetores.mensagem}</span>}
          </p>
          <button type="button" className="btn-secondary btn-sm" onClick={gerarVetores} disabled={vetores.rodando}>
            {vetores.rodando ? 'Gerando…' : 'Gerar vetores pendentes'}
          </button>
        </div>
      )}

      {aviso && (
        <p className="text-sm text-ds-subtle" role="status">
          {aviso}
        </p>
      )}

      {dados.documentos.length > 5 && (
        <label className="block">
          <span className="sr-only">Buscar documento</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, arquivo ou norma…"
            className="input"
          />
        </label>
      )}

      {documentos.length === 0 && dados.legado.length === 0 ? (
        <div className="rounded-control border-2 border-dashed border-ds-line px-6 py-10 text-center">
          <Icone nome="arquivo" tamanho={28} className="mx-auto text-ds-subtle" />
          <p className="mt-2 font-semibold text-ds-text">Nenhum documento indexado ainda</p>
          <p className="mt-1 text-sm text-ds-subtle">Envie um arquivo acima para começar.</p>
        </div>
      ) : (
        <ul className="divide-y divide-ds-line overflow-hidden rounded-control border border-ds-line">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-3 bg-ds-surface p-4 sm:flex-row sm:items-center">
              <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-control border-2 border-ds-primary text-ds-primary sm:grid">
                <Icone nome="arquivo" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ds-text" title={doc.titulo}>
                  {doc.titulo}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ds-subtle">
                  <span className="badge-neutral">{FORMATO_ROTULO[doc.formato] ?? doc.formato}</span>
                  {doc.norma_id && <span>norma: {doc.norma_id}</span>}
                  {doc.paginas ? <span>{doc.paginas} pág.</span> : null}
                  <span>{doc.trechos} trechos</span>
                  {doc.trechos_sem_vetor > 0 && <span className="text-ds-warn">{doc.trechos_sem_vetor} sem vetor</span>}
                  <span>{formatarData(doc.criado_em)}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn-danger btn-sm self-start sm:self-auto"
                onClick={() => excluir(doc)}
                disabled={ocupado === doc.id}
              >
                <Icone nome="lixeira" tamanho={15} />
                {ocupado === doc.id ? 'Excluindo…' : 'Excluir'}
              </button>
            </li>
          ))}

          {dados.legado.map((grupo) => {
            const chave = `legado:${grupo.norma_id}:${grupo.tipo}`;
            return (
              <li key={chave} className="flex flex-col gap-3 bg-ds-warn/5 p-4 sm:flex-row sm:items-center">
                <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-ds-warn/10 text-ds-warn sm:grid">
                  <Icone nome="alerta" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ds-text">
                    Trechos antigos · {grupo.norma_id} ({grupo.tipo})
                  </p>
                  <p className="mt-0.5 text-xs text-ds-subtle">
                    {grupo.trechos} trechos indexados antes da correção (cortes no meio de artigos, rótulos errados). Exclua e
                    reenvie o documento para usar a nova indexação.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-danger btn-sm self-start sm:self-auto"
                  onClick={() => excluir(grupo)}
                  disabled={ocupado === chave}
                >
                  <Icone nome="lixeira" tamanho={15} />
                  {ocupado === chave ? 'Excluindo…' : 'Excluir'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
