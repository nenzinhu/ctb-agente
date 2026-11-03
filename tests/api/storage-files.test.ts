/** @jest-environment node */
import { NextRequest } from 'next/server';
const session = jest.fn();
const list = jest.fn();
jest.mock('../../lib/auth/session', () => ({ validateSession: () => session() }));
jest.mock('../../lib/db/client', () => ({ databaseConfigured: true, supabaseAdmin: { storage: { from: (bucket: string) => { if (bucket !== 'documentos-pendentes') throw new Error('bucket inválido'); return { list: (...args: unknown[]) => list(...args) }; } } } }));
import { GET } from '@/app/api/admin/documents/storage-files/route';
const req = (query = '') => new NextRequest(`http://localhost/api/admin/documents/storage-files${query}`);
beforeEach(() => { jest.clearAllMocks(); session.mockResolvedValue(true); });
it('exige autenticação antes de acessar o bucket privado', async () => {
  session.mockResolvedValue(false);
  expect((await GET(req())).status).toBe(401);
  expect(list).not.toHaveBeenCalled();
});
it('lista pastas e arquivos sem publicar URLs assinadas', async () => {
  list.mockResolvedValue({ data: [{ name: 'originais', id: null, metadata: null }, { name: 'resolucao.pdf', id: 'pdf', metadata: { size: 100 } }, { name: 'pacote.zip', id: 'zip', metadata: {} }], error: null });
  const response = await GET(req()); const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.entries).toEqual([{ name: 'originais', path: 'originais', folder: true, supported: false }, { name: 'resolucao.pdf', path: 'resolucao.pdf', folder: false, supported: true }, { name: 'pacote.zip', path: 'pacote.zip', folder: false, supported: false }]);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('monta o caminho da subpasta e rejeita navegação inválida', async () => {
  list.mockResolvedValue({ data: [{ name: 'a.pdf', id: 'a', metadata: {} }], error: null });
  expect((await (await GET(req('?prefix=originais'))).json()).entries[0].path).toBe('originais/a.pdf');
  list.mockClear();
  expect((await GET(req('?prefix=..%2Fprivado'))).status).toBe(400);
  expect(list).not.toHaveBeenCalled();
});
it('expõe a indisponibilidade sem retornar detalhes internos', async () => {
  list.mockResolvedValue({ data: null, error: { message: 'segredo interno' } });
  const response = await GET(req());
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain('segredo interno');
});
