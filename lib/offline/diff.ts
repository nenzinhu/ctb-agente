import type { PacoteOffline } from './model';
export interface DiferencaAcervo { tipo: 'Artigo CTB' | 'Ficha MBFT' | 'POP'; id: string; titulo: string; status: 'incluído' | 'removido' | 'alterado'; antes: string; depois: string }
function documentos(p: PacoteOffline) {
  return [
    ...p.artigos.map(a=>({tipo:'Artigo CTB' as const,id:a.numero,titulo:`Art. ${a.numero}`,texto:a.texto})),
    ...p.fichas.map(f=>({tipo:'Ficha MBFT' as const,id:f.codigo,titulo:f.tipificacaoResumida,texto:JSON.stringify(Object.fromEntries(['amparoLegal','tipificacaoResumida','tipificacao','gravidade','pontuacao','penalidade','medidaAdministrativa','infrator','competencia','constatacao','configuraCrime','quandoAutuar','quandoNaoAutuar','definicoes','exemplos','informacoesComplementares'].map(k=>[k,(f as unknown as Record<string,unknown>)[k]])),null,2)})),
    ...p.pops.map(p=>({tipo:'POP' as const,id:p.numero,titulo:p.titulo,texto:JSON.stringify(Object.fromEntries(['titulo','estabelecido','atualizado','execucao','fundamentacao','sequencia','material','atividadesCriticas','errosEvitar','anexos'].map(k=>[k,(p as unknown as Record<string,unknown>)[k]])),null,2)})),
  ];
}
/** Content changes only. A different package hash/page never proves a legal amendment. */
export function compararPacotes(anterior: PacoteOffline, atual: PacoteOffline): DiferencaAcervo[] {
  const a=new Map(documentos(anterior).map(d=>[`${d.tipo}:${d.id}`,d]));
  const b=new Map(documentos(atual).map(d=>[`${d.tipo}:${d.id}`,d]));
  const result:DiferencaAcervo[]=[];
  for(const key of new Set([...a.keys(),...b.keys()])) {
    const antes=a.get(key),depois=b.get(key),d=depois??antes!;
    if(antes?.texto===depois?.texto) continue;
    result.push({tipo:d.tipo,id:d.id,titulo:d.titulo,status:!antes?'incluído':!depois?'removido':'alterado',antes:antes?.texto??'',depois:depois?.texto??''});
  }
  return result;
}
