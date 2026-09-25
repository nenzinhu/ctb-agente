'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Icone from '../ui/Icone';

// Only the master attaches POPs: visitors never download the form.
const AdminUploadForm = dynamic(() => import('../AdminUploadForm'), {
  loading: () => <div className="skeleton h-40" role="status" aria-label="Carregando formulário" />,
});

interface DocumentoPop {
  id: string;
  titulo: string;
  formato: string;
  paginas: number | null;
  trechos: number;
  criado_em: string;
}

interface BibliotecaResposta {
  documentos: DocumentoPop[];
  migracaoPendente: boolean;
  bancoConfigurado: boolean;
}

/**
 * The POPs in the base. Everyone sees the list; the logged-in master can also
 * attach new POPs and remove old ones right here.
 */
export default function PopBiblioteca() {
  const [dados, setDados] = useState<BibliotecaResposta | null>(null);
  const [erro, setErro] = useState(false);
  const [master, setMaster] = useState(false);
  const [anexando, setAnexando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/pop/documentos');
      if (!resposta.ok) throw new Error();
      setDados((await resposta.json()) as BibliotecaResposta);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    void carregar();
    fetch('/api/admin/session')
      .then((r) => setMaster(r.ok))
      .catch(() => setMaster(false));
  }, [carregar]);

  const excluir = async (doc: DocumentoPop) => {
    if (!window.confirm(`Remover "${doc.titulo}" da base de POPs?`)) return;
    setExcluindo(doc.id);
    try {
      await fetch(`/api/admin/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      await carregar();
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <section className="card card-pad" aria-labelledby="biblioteca-pop">
      <div className="flex items-center justify-between gap-2">
        <h2 id="biblioteca-pop" className="section-title">
          <Icone nome="livro" tamanho={18} className="text-brand" />
          Biblioteca de POPs
        </h2>
        {dados && dados.documentos.length > 0 && <span className="badge-neutral">{dados.documentos.length}</span>}
      </div>

      {erro && <p className="mt-3 text-sm text-danger">Não foi possível carregar a biblioteca.</p>}

      {!dados && !erro && (
        <div className="mt-4 space-y-2" role="status">
          <span className="sr-only">Carregando…</span>
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      )}

      {dados?.migracaoPendente && (
        <p className="mt-3 text-sm text-muted">
          A base de POPs ainda não foi criada no banco. {master ? 'Aplique a migration 008 no Supabase.' : 'Fale com o master.'}
        </p>
      )}

      {dados && !dados.migracaoPendente && dados.documentos.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          Nenhum POP indexado ainda.{master ? ' Anexe os arquivos abaixo.' : ' O master pode anexá-los pelo painel.'}
        </p>
      )}

      {dados && dados.documentos.length > 0 && (
        <ul className="mt-4 space-y-2">
          {dados.documentos.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <Icone nome="arquivo" tamanho={18} className="mt-0.5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-ink">{doc.titulo}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {doc.formato.toUpperCase()}
                  {doc.paginas ? ` · ${doc.paginas} pág.` : ''} · {doc.trechos} trechos
                </p>
              </div>
              {master && (
                <button
                  type="button"
                  className="btn-ghost btn-sm !min-h-[32px] !px-2 text-danger"
                  onClick={() => excluir(doc)}
                  disabled={excluindo === doc.id}
                  aria-label={`Remover ${doc.titulo}`}
                >
                  <Icone nome="lixeira" tamanho={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {master && (
        <div className="mt-5 border-t border-line pt-5">
          {anexando ? (
            <AdminUploadForm
              colecao="pop"
              compacto
              onUploadSuccess={() => {
                void carregar();
              }}
            />
          ) : (
            <button type="button" className="btn-primary w-full" onClick={() => setAnexando(true)}>
              <Icone nome="upload" tamanho={18} />
              Anexar POPs
            </button>
          )}
        </div>
      )}
    </section>
  );
}
