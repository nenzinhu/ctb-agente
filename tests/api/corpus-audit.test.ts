/** @jest-environment node */
const validateSession = jest.fn();
const listEnquadramentos = jest.fn();
const listDocuments = jest.fn();

jest.mock('../../lib/auth/session', () => ({ validateSession: (...args: unknown[]) => validateSession(...args) }));
jest.mock('../../lib/db/client', () => ({ databaseConfigured: true, databaseAdminConfigured: true }));
jest.mock('../../lib/db/queries', () => ({ listEnquadramentos: (...args: unknown[]) => listEnquadramentos(...args) }));
jest.mock('../../lib/ingestion/documents', () => ({ listDocuments: (...args: unknown[]) => listDocuments(...args) }));
jest.mock('../../lib/mbft/fichas', () => ({
  todasAsFichas: () => [{ codigo: '763-31', tipificacaoResumida: 'Celular', amparoLegal: 'Art. 252, VI.', gravidade: 'Gravíssima', pontuacao: '7 pontos' }],
}));

import { GET } from '@/app/api/admin/corpus-audit/route';

describe('GET /api/admin/corpus-audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateSession.mockResolvedValue(true);
    listEnquadramentos.mockResolvedValue([{
      codigo_mbft: '763-31', descricao: 'Celular', amparo_legal: 'Art. 252, VI do CTB',
      gravidade: 'gravíssima', pontos: 7, valor_multa: 29347,
    }]);
    listDocuments.mockResolvedValue([{ id: 'd1', colecao: 'ctb', norma_id: 'ctb-lei-9503-97', trechos: 20, trechos_sem_vetor: 3 }]);
  });

  it('nega acesso sem sessão', async () => {
    validateSession.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });

  it('combina inventário de documentos e auditoria MBFT sem alterar dados', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      corpus: { documentos: 1, trechos: 20, vetoresPendentes: 3, ctbIndexado: true },
      enquadramentos: { totalBanco: 1, totalMbft: 1, itens: [{ codigo: '763-31', fichaEncontrada: true }] },
    });
    expect(listEnquadramentos).toHaveBeenCalledTimes(1);
    expect(listDocuments).toHaveBeenCalledTimes(1);
  });
});
