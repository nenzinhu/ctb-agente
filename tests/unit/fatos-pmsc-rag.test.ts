import { combinarFatosComRag, textoRagFatos } from '@/lib/fatos-pmsc/rag';
import type { FatoPmsc } from '@/lib/fatos-pmsc/parser';

const fatos: FatoPmsc[] = [
  { grupo: 'Dano', natureza: 'Dano simples', potencialOfensivo: 'Menor Condicionado', pagina: 10, versao: '10/06/2019' },
  { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019' },
];

describe('RAG da Lista de Fatos PMSC Mobile', () => {
  it('gera seções independentes e mantém a página da fonte', () => {
    expect(textoRagFatos([fatos[0]])).toBe(
      '--- Página 10 ---\n## Dano simples\nGrupo: Dano\nNatureza: Dano simples\nPotencial ofensivo: Menor Condicionado\n'
    );
  });

  it('aceita o RAG somente quando o trecho corresponde ao catálogo oficial', () => {
    const resultado = combinarFatosComRag([], [{
      id: '1', documento_id: 'd1', titulo: 'Lista de fatos', secao: 'Dano', pagina: 10, ordem: 1, score: 1,
      texto: 'Grupo: Dano\nNatureza: Dano simples\nPotencial ofensivo: Menor Condicionado',
    }], fatos);
    expect(resultado).toEqual([{ fato: fatos[0], origem: 'rag' }]);
  });

  it('descarta conteúdo sem natureza oficial e limita a três alternativas', () => {
    const locais = [...fatos, fatos[0], fatos[1]];
    const resultado = combinarFatosComRag(locais, [{
      id: 'x', documento_id: 'd1', titulo: 'Lista', secao: null, pagina: null, ordem: 9, score: 1,
      texto: 'Natureza: Registro inventado pela IA',
    }], fatos);
    expect(resultado).toHaveLength(2);
    expect(resultado.every((item) => fatos.includes(item.fato))).toBe(true);
  });
});
