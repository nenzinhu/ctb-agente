'use client';

import { useCallback, useEffect, useState } from 'react';
import Icone from '../ui/Icone';

interface ItemAcervoStatus {
  id: string;
  titulo: string;
  descricao: string;
  paginas: number;
  fonte: string;
  indexado: boolean;
  documento?: { trechos: number; trechos_sem_vetor: number } | null;
}

interface AcervoCardProps {
  onIndexado?: () => void;
}

/**
 * Documents that ship with the app (the CTB compiled text): one click to put
 * them in the search base, no upload needed.
 */
export default function AcervoCard({ onIndexado }: AcervoCardProps) {
  const [itens, setItens] = useState<ItemAcervoStatus[] | null>(null);
  const [indexando, setIndexando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/acervo');
      if (!resposta.ok) throw new Error();
      setItens(((await resposta.json()) as { itens: ItemAcervoStatus[] }).itens);
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const indexar = async (item: ItemAcervoStatus) => {
    setIndexando(item.id);
    setMensagem(null);
    try {
      const resposta = await fetch('/api/admin/acervo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.message || corpo.error || 'Falha ao indexar.');
      const semVetor = corpo.data?.semVetor ?? 0;
      setMensagem({
        tipo: 'ok',
        texto: `${corpo.message}${semVetor > 0 ? ` ${semVetor} trecho(s) sem vetor — gere os vetores abaixo quando quiser.` : ''}`,
      });
      await carregar();
      onIndexado?.();
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: error instanceof Error ? error.message : 'Falha ao indexar.' });
    } finally {
      setIndexando(null);
    }
  };

  if (itens === null) return <div className="skeleton h-24" />;
  if (itens.length === 0) return null;

  return (
    <div className="space-y-3">
      {itens.map((item) => (
        <div key={item.id} className="flex flex-col gap-4 rounded-control border border-ds-line bg-ds-muted p-4 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ds-primary text-ds-on-solid">
            <Icone nome="livro" tamanho={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ds-text">{item.titulo}</p>
            <p className="mt-0.5 text-sm text-ds-subtle">{item.descricao}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ds-subtle">
              <span>{item.paginas} páginas</span>
              <a href={item.fonte} target="_blank" rel="noopener noreferrer" className="font-medium text-ds-primary underline">
                Fonte oficial
              </a>
              {item.indexado && item.documento && <span>{item.documento.trechos} trechos na base</span>}
            </p>
          </div>
          {item.indexado ? (
            <span className="badge-brand self-start sm:self-auto">
              <Icone nome="check" tamanho={14} />
              Indexado
            </span>
          ) : (
            <button
              type="button"
              className="btn-primary self-start sm:self-auto"
              onClick={() => indexar(item)}
              disabled={indexando !== null}
            >
              <Icone nome="base" tamanho={18} />
              {indexando === item.id ? 'Indexando…' : 'Indexar agora'}
            </button>
          )}
        </div>
      ))}
      {mensagem && (
        <div className={mensagem.tipo === 'ok' ? 'alert-success' : 'alert-error'} role={mensagem.tipo === 'ok' ? 'status' : 'alert'}>
          <Icone
            nome={mensagem.tipo === 'ok' ? 'check' : 'alerta'}
            className={`mt-0.5 shrink-0 ${mensagem.tipo === 'ok' ? 'text-ds-success' : 'text-ds-danger'}`}
          />
          <p>{mensagem.texto}</p>
        </div>
      )}
    </div>
  );
}
