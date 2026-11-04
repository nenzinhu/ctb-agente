'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { requestJson } from '@/lib/client/request';
import { FONTE_CTB, type ArtigoConsulta } from '@/lib/ctb/artigos';
const Context = createContext<((numero: string) => void) | null>(null);
export const useCtbReader = () => useContext(Context);
export default function CtbReaderProvider({ children }: { children: ReactNode }) {
  const [numero, setNumero] = useState<string | null>(null);
  const [artigo, setArtigo] = useState<ArtigoConsulta | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!numero) return;
    const controller = new AbortController();
    setArtigo(null); setErro('');
    dialog.current?.showModal();
    requestJson<{ artigo: ArtigoConsulta }>(`/api/ctb/artigos/${encodeURIComponent(numero)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { if (!data.artigo?.texto) throw new Error('Artigo indisponível no acervo.'); setArtigo(data.artigo); } })
      .catch(error => { if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Não foi possível abrir o artigo.'); });
    return () => controller.abort();
  }, [numero, tentativa]);
  return <Context.Provider value={n => { setArtigo(null); setErro(''); setNumero(n); }}>{children}{numero && (
    <dialog ref={dialog} className="app-dialog" aria-labelledby="leitor-artigo-titulo" onClose={() => { setNumero(null); setArtigo(null); }} onCancel={event => { event.preventDefault(); dialog.current?.close(); }}>
      <header className="app-dialog-header"><h2 id="leitor-artigo-titulo">Art. {numero} do CTB</h2><button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>Voltar à consulta</button></header>
      <div className="app-dialog-body">
        {!artigo && !erro && <p role="status">Abrindo artigo…</p>}
        {erro && <div role="alert"><p>{erro}</p><button type="button" className="btn-secondary mt-3" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></div>}
        {artigo && <><p className="mb-4 text-sm text-ds-subtle">Acervo do aplicativo · versão {artigo.versao}</p><p className="whitespace-pre-wrap text-base leading-relaxed">{artigo.texto}</p><p className="mt-5 text-sm text-ds-subtle">{artigo.aviso}</p></>}
        <a className="mt-4 inline-block font-semibold text-ds-ink underline" href={artigo?.fonte ?? `${FONTE_CTB}#art${numero.replace('-', '').toLowerCase()}`} target="_blank" rel="noopener noreferrer">Conferir no Planalto (nova aba)</a>
      </div>
    </dialog>)}</Context.Provider>;
}
