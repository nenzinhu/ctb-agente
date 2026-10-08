import { reordenarCandidatos, reordenarListasBusca, rankingAmbiguo, type CandidatoRanking } from '@/lib/search/reranker';

const candidatos: CandidatoRanking[] = [
  {
    id: 'crime',
    colecao: 'ctb',
    titulo: 'Art. 306',
    texto: 'Conduzir veículo com capacidade psicomotora alterada por álcool.',
    posicaoLexical: 1,
    posicaoVetorial: 1,
  },
  {
    id: 'infracao',
    colecao: 'ctb',
    titulo: 'Art. 165',
    texto: 'Dirigir sob a influência de álcool. Infração gravíssima.',
    posicaoLexical: 2,
    posicaoVetorial: 2,
    campos: { artigo: '165', tipo: 'infracao' },
  },
];

describe('reranker local', () => {
  it('prioriza o candidato compatível com a intenção sem inventar candidatos', () => {
    const resultado = reordenarCandidatos('motorista bêbado qual infração', { intencao: 'infracao', confianca: 0.9, sinais: [] }, candidatos);
    expect(resultado.map((item) => item.id)).toEqual(['infracao', 'crime']);
    expect(resultado.every((item) => candidatos.some((candidato) => candidato.id === item.id))).toBe(true);
  });

  it('dá precedência absoluta ao identificador exato', () => {
    const resultado = reordenarCandidatos('art. 306', {
      intencao: 'artigo', confianca: 1, identificador: 'art. 306', sinais: ['artigo_exato'],
    }, candidatos);
    expect(resultado[0].id).toBe('crime');
    expect(resultado[0].motivos).toContain('identificador exato');
  });

  it('detecta empate que pode justificar reranking por IA', () => {
    expect(rankingAmbiguo([
      { ...candidatos[0], score: 0.61, motivos: [] },
      { ...candidatos[1], score: 0.6, motivos: [] },
    ])).toBe(true);
  });

  it('deduplica as listas lexical e vetorial preservando os sinais de origem', () => {
    const resultado = reordenarListasBusca(
      'motorista bêbado qual infração',
      'ctb',
      [
        { id: 'crime', numero_dispositivo: 'art. 306', texto: candidatos[0].texto, rank: 3 },
        { id: 'infracao', numero_dispositivo: 'art. 165', texto: candidatos[1].texto, rank: 2 },
      ],
      [
        { id: 'infracao', numero_dispositivo: 'art. 165', texto: candidatos[1].texto, similarity: 0.8 },
      ]
    );
    expect(resultado.map((item) => item.id)).toEqual(['infracao', 'crime']);
    expect(resultado[0]).toMatchObject({ posicaoLexical: 2, posicaoVetorial: 1, scoreLexical: 2, similaridadeVetorial: 0.8 });
  });
});
