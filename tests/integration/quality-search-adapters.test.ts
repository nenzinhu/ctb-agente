/** @jest-environment node */

const buscarFichas = jest.fn();
const buscarPops = jest.fn();
const hybridSearch = jest.fn();

jest.mock('../../lib/mbft/fichas', () => ({ buscarFichas: (...args: unknown[]) => buscarFichas(...args) }));
jest.mock('../../lib/pop/pops', () => ({ buscarPops: (...args: unknown[]) => buscarPops(...args) }));
jest.mock('../../lib/search/hybrid', () => ({ hybridSearch: (...args: unknown[]) => hybridSearch(...args) }));

import { buscarParaDiagnostico } from '@/lib/quality/search-adapters';
import type { CasoBusca } from '@/lib/quality/cases';

const entrada = (colecao: CasoBusca['colecao']): CasoBusca => ({
  id: `caso-${colecao}`,
  colecao,
  consulta: 'consulta operacional',
  categoria: 'frase',
  esperados: ['esperado'],
  comparacao: 'exata',
  maxPosicao: 3,
});

describe('adaptadores do diagnóstico de busca', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mapeia fichas MBFT para códigos estáveis', async () => {
    buscarFichas.mockReturnValue([{ codigo: '516-91' }, { codigo: '518-51' }]);
    await expect(buscarParaDiagnostico(entrada('mbft'))).resolves.toEqual(['516-91', '518-51']);
    expect(buscarFichas).toHaveBeenCalledWith('consulta operacional', 3);
  });

  it('mapeia POPs para números estáveis', async () => {
    buscarPops.mockReturnValue([{ numero: '002' }, { numero: '003' }]);
    await expect(buscarParaDiagnostico(entrada('pop'))).resolves.toEqual(['002', '003']);
    expect(buscarPops).toHaveBeenCalledWith('consulta operacional', 3);
  });

  it('mapeia resultados CTB sem chamar geração por IA', async () => {
    hybridSearch.mockResolvedValue([{ numero_dispositivo: 'art. 165' }, { numero_dispositivo: 'art. 165-A' }]);
    await expect(buscarParaDiagnostico(entrada('ctb'))).resolves.toEqual(['art. 165', 'art. 165-A']);
    expect(hybridSearch).toHaveBeenCalledWith('consulta operacional', 3);
  });
});
