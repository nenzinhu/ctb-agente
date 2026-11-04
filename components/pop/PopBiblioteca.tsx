'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/client/request';
import dynamic from 'next/dynamic';
import Icone from '../ui/Icone';
import SectionCard from '../ui/SectionCard';

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
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const request = useRef<AbortController | null>(null);
  const [master, setMaster] = useState(false);
  const [anexando, setAnexando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setCarregando(true); setErro(null);
    try {
      const dados = await requestJson<BibliotecaResposta>('/api/pop/documentos', { signal: controller.signal });
      if (!dados || !Array.isArray(dados.documentos) || typeof dados.bancoConfigurado !== 'boolean') throw new Error('O serviço retornou uma biblioteca inválida.');
      if (!controller.signal.aborted) setDados(dados);
    } catch (error) {
      if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void carregar();
    requestJson('/api/admin/session', { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setMaster(true); })
      .catch(() => { if (!controller.signal.aborted) setMaster(false); });
    return () => { request.current?.abort(); controller.abort(); };
  }, [carregar]);

  const excluir = async (doc: DocumentoPop) => {
    if (!window.confirm(`Remover "${doc.titulo}" da base de POPs?`)) return;
    setExcluindo(doc.id);
    try {
      await requestJson(`/api/admin/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível remover o documento.');
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <SectionCard
      titulo="Biblioteca de POPs"
      icone="livro"
      acao={dados && dados.documentos.length > 0 && <span className="badge-neutral">{dados.documentos.length}</span>}
    >
      {erro && <div role="alert" className="space-y-3 text-sm text-ds-danger"><p>{erro}</p><button type="button" className="btn-secondary" onClick={() => void carregar()}>Tentar novamente</button><p className="text-ds-subtle">O manual incluído no projeto continua acessível em “Consultar o manual disponível”. Confira a fonte vigente antes de agir.</p></div>}

      {carregando && (
        <div className="space-y-2" role="status">
          <span className="sr-only">Carregando…</span>
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      )}

      {dados?.migracaoPendente && (
        <p className="text-sm text-ds-subtle">
          A base de POPs ainda não foi criada no banco. {master ? 'Aplique a migração 008 no Supabase.' : 'Fale com o administrador.'}
        </p>
      )}

      {dados && !dados.bancoConfigurado && <p className="text-sm text-ds-subtle">A biblioteca de documentos anexados está indisponível: o banco não está configurado. Consulte o manual incluído no projeto.</p>}

      {dados && dados.bancoConfigurado && !dados.migracaoPendente && dados.documentos.length === 0 && (
        <p className="text-sm text-ds-subtle">
          Nenhum POP indexado ainda.{master ? ' Anexe os arquivos abaixo.' : ' O administrador pode anexá-los pelo painel.'}
        </p>
      )}

      {dados && dados.documentos.length > 0 && (
        <ul className="space-y-2">
          {dados.documentos.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 rounded-xl border border-ds-line p-3">
              <Icone nome="arquivo" tamanho={18} className="mt-0.5 shrink-0 text-ds-primary" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-ds-text">{doc.titulo}</p>
                <p className="mt-0.5 text-xs text-ds-subtle">
                  {doc.formato.toUpperCase()}
                  {doc.paginas ? ` · ${doc.paginas} pág.` : ''} · {doc.trechos} trechos
                </p>
              </div>
              {master && (
                <button
                  type="button"
                  className="btn-ghost btn-sm !min-h-[32px] !px-2 text-ds-danger"
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
        <div className="mt-5 border-t border-ds-line pt-5">
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
    </SectionCard>
  );
}
