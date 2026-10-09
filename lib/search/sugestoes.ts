import { buscarFichas, todasAsFichas } from '@/lib/mbft/fichas';
import { buscarPops } from '@/lib/pop/pops';
import { extractArticleRef } from '@/lib/query/router';

export type FonteSugestao = 'ctb' | 'pop';

export interface SugestaoBusca {
  valor: string;
  tipo: 'Artigo CTB' | 'Infração MBFT' | 'POP';
  titulo: string;
  detalhe: string;
}

/** Fast local suggestions. Values are exact identifiers, so selecting one
 * narrows the next consultation instead of silently guessing the result. */
export function sugerirBusca(consulta: string, fonte: FonteSugestao, limite = 5): SugestaoBusca[] {
  const texto = consulta.trim();
  if (texto.length < 3 || limite <= 0) return [];

  if (fonte === 'pop') {
    return buscarPops(texto, limite).map((pop) => ({
      valor: `POP ${pop.numero}`,
      tipo: 'POP',
      titulo: `POP ${pop.numero} — ${pop.titulo}`,
      detalhe: [pop.execucao ? `Execução: ${pop.execucao}` : 'Procedimento oficial', pop.pagina ? `página ${pop.pagina}` : null]
        .filter(Boolean).join(' · '),
    }));
  }

  const sugestoes: SugestaoBusca[] = [];
  const artigo = extractArticleRef(texto);
  if (artigo) {
    sugestoes.push({
      valor: artigo,
      tipo: 'Artigo CTB',
      titulo: artigo.replace(/^art\./, 'Art.'),
      detalhe: 'Abrir diretamente este dispositivo do CTB',
    });
  }

  const prefixoCodigo = /^(?:c[oó]digo\s*)?(\d{3,4})$/i.exec(texto)?.[1];
  const fichas = prefixoCodigo
    ? todasAsFichas().filter((ficha) => ficha.codigo.replace(/\D/g, '').startsWith(prefixoCodigo)).slice(0, limite)
    : buscarFichas(texto, limite);

  for (const ficha of fichas) {
    sugestoes.push({
      valor: ficha.codigo,
      tipo: 'Infração MBFT',
      titulo: `${ficha.codigo} — ${ficha.tipificacaoResumida}`,
      detalhe: `${ficha.amparoLegal}${ficha.quandoAutuar[0] ? ` · Quando autuar: ${ficha.quandoAutuar[0].replace(/^\d+\.\s*/, '')}` : ''}`,
    });
  }

  return sugestoes
    .filter((item, indice, todos) => todos.findIndex((outro) => outro.valor === item.valor) === indice)
    .slice(0, limite);
}
