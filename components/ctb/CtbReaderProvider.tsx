'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import OrigemTexto from '@/components/OrigemTexto';
import AppDialog from '@/components/ui/AppDialog';
import { lerPacote } from '@/lib/offline/store';
import { requestJson } from '@/lib/client/request';
import { FONTE_CTB, numeroArtigo, type ArtigoConsulta } from '@/lib/ctb/artigos';
const Context = createContext<((numero: string) => void) | null>(null);
export const useCtbReader = () => useContext(Context);
export default function CtbReaderProvider({ children }: { children: ReactNode }) {
  const [numero, setNumero] = useState<string | null>(null);
  const [artigo, setArtigo] = useState<ArtigoConsulta | null>(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (!numero) return;
    const controller = new AbortController();
    setArtigo(null); setErro('');
    const local = async () => { const salvo = await lerPacote().catch(() => null); return salvo?.pacote.artigos.find(a => a.numero === numero) ?? null; };
    const carregar = async () => {
      let texto: ArtigoConsulta | null = null;
      if (!navigator.onLine) texto = await local();
      if (!texto) {
        try { texto = (await requestJson<{ artigo: ArtigoConsulta }>(`/api/ctb/artigos/${encodeURIComponent(numero)}`, { signal: controller.signal })).artigo; }
        catch (error) { if (controller.signal.aborted) return; texto = await local(); if (!texto) throw error; }
      }
      if (!texto?.texto) throw new Error('Artigo não disponível no acervo deste aparelho.');
      if (!controller.signal.aborted) setArtigo(texto);
    };
    carregar().catch(error => { if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Não foi possível abrir o artigo.'); });
    return () => controller.abort();
  }, [numero, tentativa]);
  return <Context.Provider value={n => { setArtigo(null); setErro(''); setNumero(numeroArtigo(n)); }}>{children}{numero && (
    <AppDialog open={!!numero} title={`Art. ${numero} do CTB`} onClose={() => { setNumero(null); setArtigo(null); }}>
        {!artigo && !erro && <p role="status">Abrindo artigo…</p>}
        {erro && <div role="alert"><p>{erro}</p><button type="button" className="btn-secondary mt-3" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></div>}
        {artigo && <><OrigemTexto tipo="acervo" /><p className="mb-4 text-sm text-ds-subtle">Acervo do aplicativo · versão {artigo.versao}</p><p className="whitespace-pre-wrap text-base leading-relaxed">{artigo.texto}</p><p className="mt-5 text-sm text-ds-subtle">{artigo.aviso}</p></>}
        <a className="mt-4 inline-block font-semibold text-ds-ink underline" href={artigo?.fonte ?? `${FONTE_CTB}#art${numero.replace('-', '').toLowerCase()}`} target="_blank" rel="noopener noreferrer">Conferir no Planalto (nova aba)</a>
    </AppDialog>)}</Context.Provider>;
}
