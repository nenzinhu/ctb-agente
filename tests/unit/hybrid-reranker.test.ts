const texto = jest.fn();
const vetor = jest.fn();

jest.mock('../../lib/search/bm25', () => ({ searchByTsvector: (...args: unknown[]) => texto(...args) }));
jest.mock('../../lib/search/vector', () => ({ searchByVector: (...args: unknown[]) => vetor(...args) }));
jest.mock('../../lib/config/settings', () => ({ getSettings: async () => ({ pesoInfracoes: 1.04 }) }));

import { hybridSearch } from '@/lib/search/hybrid';

describe('integração do reranker na busca híbrida', () => {
  it('usa a intenção para promover a infração correta acima de um crime semanticamente próximo', async () => {
    const linha = (id: string, numero: string, conteudo: string) => ({ id, numero_dispositivo: numero, texto: conteudo });
    const crime = linha('306', 'art. 306', 'Conduzir veículo com capacidade psicomotora alterada por álcool.');
    const infracao = linha('165', 'art. 165', 'Dirigir sob influência de álcool. Infração gravíssima.');
    const outros = [
      linha('1', 'art. 10', 'Disposição geral.'),
      linha('2', 'art. 20', 'Competência administrativa.'),
      linha('3', 'art. 30', 'Norma de circulação.'),
    ];
    texto.mockResolvedValue([crime, ...outros, infracao]);
    vetor.mockResolvedValue([crime, ...outros, infracao]);

    const resultado = await hybridSearch('motorista bêbado qual infração', 2);
    expect(resultado.map((item) => item.id)).toEqual(['165', '306']);
  });
});
