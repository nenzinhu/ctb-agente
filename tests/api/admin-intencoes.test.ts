/** @jest-environment node */

let autenticado = false;
const listarExemplosIntencao = jest.fn();
const corrigirExemploIntencao = jest.fn();

jest.mock('../../lib/auth/session', () => ({ validateSession: async () => autenticado }));
jest.mock('../../lib/search/intent-feedback-repository', () => ({
  listarExemplosIntencao: (...args: unknown[]) => listarExemplosIntencao(...args),
  corrigirExemploIntencao: (...args: unknown[]) => corrigirExemploIntencao(...args),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/admin/intencoes/route';

const patch = (body: unknown) => PATCH(new NextRequest('http://localhost/api/admin/intencoes', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

describe('/api/admin/intencoes', () => {
  beforeEach(() => {
    autenticado = false;
    jest.clearAllMocks();
  });

  it('protege consultas e correções com a sessão administrativa', async () => {
    expect((await GET()).status).toBe(401);
    expect((await patch({ id: 'x', dominioEsperado: 'pop' })).status).toBe(401);
  });

  it('lista exemplos anônimos que aguardam revisão', async () => {
    autenticado = true;
    listarExemplosIntencao.mockResolvedValue([{ id: 'e1', consulta_anonimizada: 'mexendo no zap' }]);
    const resposta = await GET();
    await expect(resposta.json()).resolves.toEqual({ exemplos: [{ id: 'e1', consulta_anonimizada: 'mexendo no zap' }] });
  });

  it('registra o domínio e os resultados esperados revisados por uma pessoa', async () => {
    autenticado = true;
    corrigirExemploIntencao.mockResolvedValue({ id: 'e1', revisada: true });
    const resposta = await patch({
      id: 'e1',
      dominioEsperado: 'infracao',
      resultadosEsperados: [{ tipo: 'ficha_mbft', id: '763-32' }],
      notaCorrecao: 'O agente descreveu manuseio, não apenas uso.',
    });

    expect(resposta.status).toBe(200);
    expect(corrigirExemploIntencao).toHaveBeenCalledWith('e1', {
      dominioEsperado: 'infracao',
      resultadosEsperados: [{ tipo: 'ficha_mbft', id: '763-32' }],
      notaCorrecao: 'O agente descreveu manuseio, não apenas uso.',
    });
  });

  it('rejeita rótulos fora da taxonomia de intenção', async () => {
    autenticado = true;
    expect((await patch({ id: 'e1', dominioEsperado: 'legislacao_treinada' })).status).toBe(400);
    expect(corrigirExemploIntencao).not.toHaveBeenCalled();
  });
});
