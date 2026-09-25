import {
  ROTAS_PUBLICAS,
  problemasDaSaude,
  problemasDasRotas,
  type RespostaRota,
} from '@/lib/health/smoke';

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'ok',
    timestamp: '2026-09-23T23:03:10.023Z',
    versao: '17cf0db',
    banco: 'ok',
    cache: 'ok',
    embeddings: 'ok',
    ...overrides,
  };
}

describe('problemasDaSaude', () => {
  it('accepts a healthy deployment', () => {
    expect(problemasDaSaude(payload())).toEqual([]);
  });

  it('accepts the commit that was pushed', () => {
    expect(problemasDaSaude(payload(), '17cf0db4027554ae2b2e18fb35192742bff0f29d')).toEqual([]);
  });

  it('flags a deployment still serving another commit', () => {
    const problemas = problemasDaSaude(payload(), 'b9590d5000000000000000000000000000000000');

    expect(problemas).toEqual(['no ar a versão "17cf0db", esperada "b9590d5"']);
  });

  it('flags a degraded deployment and reports why', () => {
    expect(problemasDaSaude(payload({ status: 'degraded', banco: 'indisponivel' }))).toEqual([
      '/api/health respondeu status "degraded"',
      'banco: indisponivel',
    ]);
  });

  it('flags a cache or embeddings outage', () => {
    expect(problemasDaSaude(payload({ cache: 'indisponivel', embeddings: 'erro' }))).toEqual([
      'cache: indisponivel',
      'embeddings: erro',
    ]);
  });

  it('rejects a body that is not JSON', () => {
    expect(problemasDaSaude('<html>503</html>')).toEqual(['/api/health não devolveu JSON']);
    expect(problemasDaSaude(null)).toEqual(['/api/health não devolveu JSON']);
  });
});

describe('problemasDasRotas', () => {
  const todasOk: RespostaRota[] = ROTAS_PUBLICAS.map((rota) => ({
    caminho: rota.caminho,
    status: rota.status,
  }));

  it('accepts every route answering as expected', () => {
    expect(problemasDasRotas(todasOk)).toEqual([]);
  });

  it('flags a route with the wrong status', () => {
    const respostas = todasOk.map((rota) =>
      rota.caminho === '/favoritos' ? { ...rota, status: 404 } : rota
    );

    expect(problemasDasRotas(respostas)).toEqual(['/favoritos: HTTP 404 (esperado 200)']);
  });

  it('flags a route that did not answer at all', () => {
    const respostas = todasOk.map((rota) => (rota.caminho === '/' ? { ...rota, status: null } : rota));

    expect(problemasDasRotas(respostas)).toEqual(['/: HTTP sem resposta (esperado 200)']);
  });

  it('flags every route when nothing was probed', () => {
    expect(problemasDasRotas([])).toHaveLength(ROTAS_PUBLICAS.length);
  });

  it('checks only the routes it is asked about', () => {
    expect(
      problemasDasRotas([{ caminho: '/x', status: 200 }], [{ caminho: '/x', status: 200 }])
    ).toEqual([]);
  });
});
