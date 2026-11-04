/** @jest-environment node */
import { NextRequest } from 'next/server';
const session = jest.fn();
const registered = jest.fn();
const vectors = jest.fn();
let legacy: { data: unknown; error: unknown };
jest.mock('../../lib/auth/session', () => ({ validateSession: () => session() }));
jest.mock('../../lib/ingestion/backfill', () => ({ countPendingEmbeddings: () => vectors() }));
jest.mock('../../lib/ingestion/documents', () => ({ ...jest.requireActual('../../lib/ingestion/documents'), listDocumentsWithQualityStatus: (...args: unknown[]) => registered(...args) }));
jest.mock('../../lib/db/client', () => ({ databaseConfigured: true, supabaseAdmin: { from: () => {
  const chain = { select: () => chain, is: () => chain, limit: async () => legacy };
  return chain;
} } }));
import { GET } from '@/app/api/admin/documents/route';
const request = () => new NextRequest('http://localhost/api/admin/documents?colecao=ctb');
const resolution = { id: 'doc-1013', titulo: 'Resolução 1.013/2024', colecao: 'ctb', norma_id: 'resolucao-contran-1013-2024' };
beforeEach(() => { jest.clearAllMocks(); session.mockResolvedValue(true); registered.mockResolvedValue({ documentos: [resolution], migracaoQualidadePendente: false }); vectors.mockResolvedValue(5); legacy = { data: [], error: null }; });
it('mantém resoluções listadas quando a contagem HEAD de vetores retorna erro sem mensagem', async () => {
  vectors.mockRejectedValue(new Error(''));
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ documentos: [resolution], pendentesVetor: null, message: expect.stringContaining('vetores') });
});
it('mantém documentos registrados quando só a consulta legada está indisponível', async () => {
  legacy = { data: null, error: { message: 'consulta legada indisponível' } };
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ documentos: [resolution], legado: [], legadoIndisponivel: true, pendentesVetor: 5 });
});
it('não transforma falha no cadastro principal em uma lista vazia de sucesso', async () => {
  registered.mockRejectedValue(new Error('falha no cadastro'));
  expect((await GET(request())).status).toBe(500);
});
it('exige sessão antes de consultar os documentos', async () => {
  session.mockResolvedValue(false);
  expect((await GET(request())).status).toBe(401);
  expect(registered).not.toHaveBeenCalled();
});
