/**
 * @jest-environment node
 */
import { GET } from '@/app/api/pop/[numero]/route';

jest.mock('../../lib/pop/pops', () => ({
  buscarPopPorNumero: jest.fn((numero: string) => numero === '002'
    ? { numero: '002', titulo: 'Busca pessoal' }
    : null),
}));

describe('GET /api/pop/[numero]', () => {
  it('retorna o POP exato do catálogo local', async () => {
    const resposta = await GET(new Request('http://localhost/api/pop/002'), {
      params: Promise.resolve({ numero: '002' }),
    });

    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toMatchObject({ numero: '002', titulo: 'Busca pessoal' });
  });

  it('retorna 404 para uma referência inexistente', async () => {
    const resposta = await GET(new Request('http://localhost/api/pop/999'), {
      params: Promise.resolve({ numero: '999' }),
    });

    expect(resposta.status).toBe(404);
  });
});
