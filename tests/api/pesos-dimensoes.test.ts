/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST as consultar } from '@/app/api/pesos-dimensoes/consultar/route';
import { POST as perguntar } from '@/app/api/pesos-dimensoes/perguntar/route';
import { ProviderChain } from '@/lib/ai/providers/chain';

function requisicao(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const entradaValida = {
  configuracaoId: 'truck-3-eixos',
  limite: { taraKg: 9000, comprimentoM: 10, pbtTecnicoKg: 23000 },
  fiscalizacao: { modo: 'documento', pesoCargaDocumentoKg: 14001, quantidadeEmbarcadores: 1 },
};

describe('APIs de pesos e dimensões', () => {
  it('calcula documento fiscal sem delegar a regra para a IA', async () => {
    const response = await consultar(requisicao('/api/pesos-dimensoes/consultar', entradaValida));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configuracao.id).toBe('truck-3-eixos');
    expect(body.fiscalizacao).toMatchObject({ status: 'autuavel', excessoTotalKg: 1, codigos: ['683-11'] });
    expect(body.fiscalizacao.fontes.length).toBeGreaterThan(0);
  });

  it('aceita o modo balança com grupos de eixo', async () => {
    const response = await consultar(requisicao('/api/pesos-dimensoes/consultar', {
      ...entradaValida,
      fiscalizacao: {
        modo: 'balanca',
        pesoTotalAferidoKg: 24350,
        gruposEixo: [{ id: 'traseiro', nome: 'Traseiro', pesoKg: 11600, limiteLegalKg: 10000 }],
      },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.fiscalizacao.codigos).toEqual(['683-13']);
  });

  it('rejeita configuração inexistente, negativos e número localizado', async () => {
    const inexistente = await consultar(requisicao('/api/pesos-dimensoes/consultar', {
      ...entradaValida,
      configuracaoId: 'inventado',
    }));
    expect(inexistente.status).toBe(404);

    const negativo = await consultar(requisicao('/api/pesos-dimensoes/consultar', {
      ...entradaValida,
      limite: { ...entradaValida.limite, taraKg: -1 },
    }));
    expect(negativo.status).toBe(400);

    const localizado = await consultar(requisicao('/api/pesos-dimensoes/consultar', {
      ...entradaValida,
      limite: { ...entradaValida.limite, taraKg: '9.000,00' },
    }));
    expect(localizado.status).toBe(400);
    expect((await localizado.json()).message).toMatch(/número.*quilogramas|quilogramas.*número/i);
  });

  it('retorna explicação e fontes mesmo quando a IA falha', async () => {
    jest.spyOn(ProviderChain.prototype, 'generateRapido').mockRejectedValueOnce(new Error('indisponível'));
    const response = await perguntar(requisicao('/api/pesos-dimensoes/perguntar', {
      consulta: 'Qual é a tolerância de cinco por cento na balança?',
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.origem).toBe('fontes-oficiais');
    expect(body.fontes.length).toBeGreaterThan(0);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('limita a pergunta livre a 500 caracteres', async () => {
    const response = await perguntar(requisicao('/api/pesos-dimensoes/perguntar', { consulta: 'a'.repeat(501) }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/3 a 500 caracteres/i);
  });
});
