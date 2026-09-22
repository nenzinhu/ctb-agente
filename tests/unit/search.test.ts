// Unit tests for search and reranking
import { rerank } from '@/lib/search/reranker';

describe('Reranker', () => {
  it('should rank results by score', () => {
    const results = [
      {
        id: '1',
        numero_dispositivo: 'art. 165',
        texto: 'text1',
        rank: 0.5,
      },
      {
        id: '2',
        numero_dispositivo: 'art. 181',
        texto: 'text2',
        rank: 0.8,
      },
    ];

    const ranked = rerank(results, 'test query');
    expect(ranked[0].id).toBe('2'); // Higher rank should come first
  });

  it('should handle empty results', () => {
    const results: any[] = [];
    const ranked = rerank(results, 'test query');
    expect(ranked).toEqual([]);
  });

  it('should consider recency in scoring', () => {
    const today = new Date();
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    const results = [
      {
        id: '1',
        numero_dispositivo: 'art. 165',
        texto: 'text1',
        rank: 0.5,
        data_publicacao: oneYearAgo.toISOString(),
        citacoes_dentro: [],
      },
      {
        id: '2',
        numero_dispositivo: 'art. 181',
        texto: 'text2',
        rank: 0.5,
        data_publicacao: today.toISOString(),
        citacoes_dentro: [],
      },
    ];

    const ranked = rerank(results, 'test query', 0.1, 0.2);
    // More recent should rank higher when other scores equal
    expect(ranked[0].numero_dispositivo).toBe('art. 181');
  });

  it('should consider citability in scoring', () => {
    const results = [
      {
        id: '1',
        numero_dispositivo: 'art. 165',
        texto: 'text1',
        rank: 0.5,
        citacoes_dentro: [],
      },
      {
        id: '2',
        numero_dispositivo: 'art. 181',
        texto: 'text2',
        rank: 0.5,
        citacoes_dentro: ['art. 165', 'art. 200', 'art. 250'],
      },
    ];

    const ranked = rerank(results, 'test query', 0.1, 0.2);
    // More cited should rank higher when other scores equal
    expect(ranked[0].numero_dispositivo).toBe('art. 181');
  });
});
