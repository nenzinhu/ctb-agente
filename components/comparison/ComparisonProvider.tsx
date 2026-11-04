'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FichaMbft } from '@/lib/mbft/parser';
import AppDialog from '@/components/ui/AppDialog';
import TextoReferenciasCtb from '@/components/TextoReferenciasCtb';
interface Comparison { fichas: FichaMbft[]; toggle: (f: FichaMbft) => void; open: () => void; aviso: string; avisoCodigo: string }
const Context = createContext<Comparison | null>(null);
export const useComparison = () => useContext(Context);
const CAMPOS: Array<[string, keyof FichaMbft]> = [['Amparo legal','amparoLegal'],['Tipificação','tipificacaoResumida'],['Gravidade','gravidade'],['Penalidade','penalidade'],['Pontuação','pontuacao'],['Medida administrativa','medidaAdministrativa'],['Infrator','infrator'],['Constatação','constatacao'],['Quando autuar','quandoAutuar'],['Quando não autuar','quandoNaoAutuar']];
export default function ComparisonProvider({ children }: { children: ReactNode }) {
  const [fichas, setFichas] = useState<FichaMbft[]>([]), [open, setOpen] = useState(false), [aviso, setAviso] = useState(''), [avisoCodigo, setAvisoCodigo] = useState('');
  const toggle = (f: FichaMbft) => {
    setAviso(''); setAvisoCodigo('');
    if (fichas.some(item => item.codigo === f.codigo)) setFichas(prev => prev.filter(item => item.codigo !== f.codigo));
    else if (fichas.length < 3) setFichas(prev => prev.some(item => item.codigo === f.codigo) || prev.length >= 3 ? prev : [...prev, f]);
    else { setAvisoCodigo(f.codigo); setAviso('Compare até três fichas. Remova uma das selecionadas para incluir outra.'); }
  };
  return <Context.Provider value={{ fichas, toggle, open: () => setOpen(true), aviso, avisoCodigo }}>{children}<AppDialog open={open} onClose={() => setOpen(false)} title="Comparar fichas MBFT">
    <p className="text-sm text-ds-subtle">Comparação dos textos do acervo. Confira condições, exceções e fonte; esta ferramenta não escolhe o enquadramento.</p>
    {!fichas.length ? <p className="mt-4">Inclua até três fichas a partir do resumo de uma consulta.</p> : <><div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Tabela comparativa de fichas"><table className="min-w-[620px] w-full border-collapse text-sm"><thead><tr><th className="p-3 text-left">Campo</th>{fichas.map(f => <th key={f.codigo} scope="col" className="p-3 text-left"><span>{f.codigo}</span><button type="button" className="mt-1 block font-normal text-ds-ink underline" onClick={() => toggle(f)} aria-label={`Remover ${f.codigo} da comparação`}>Remover</button></th>)}</tr></thead><tbody>{CAMPOS.map(([label,key]) => <tr key={key} className="border-t border-ds-line"><th scope="row" className="p-3 text-left align-top">{label}</th>{fichas.map(f => { const valor = f[key]; const texto = Array.isArray(valor) ? valor.join('\n\n') : typeof valor === 'string' ? valor : ''; return <td key={f.codigo} className="whitespace-pre-line p-3 align-top">{key === 'amparoLegal' ? <TextoReferenciasCtb texto={texto} contextoCtb /> : texto || 'Não informado no acervo'}</td>; })}</tr>)}</tbody></table></div><button type="button" className="btn-ghost mt-4" onClick={() => setFichas([])}>Limpar comparação</button></>}
  </AppDialog></Context.Provider>;
}
export function CompareFichaButton({ ficha }: { ficha: FichaMbft }) {
  const context = useComparison();
  if (!context) return null;
  const selected = context.fichas.some(f => f.codigo === ficha.codigo);
  return <div className="mt-4 print:hidden"><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" aria-pressed={selected} onClick={() => context.toggle(ficha)}>{selected ? 'Retirar da comparação' : 'Incluir na comparação'}</button>{context.fichas.length > 0 && <button type="button" className="btn-ghost" onClick={context.open}>Comparar selecionadas ({context.fichas.length}/3)</button>}</div>{context.aviso && context.avisoCodigo === ficha.codigo && <p role="alert" className="mt-2 text-sm text-ds-warn">{context.aviso}</p>}</div>;
}
