import {
  clearProviderHealth,
  getProviderHealth,
  isProviderAvailable,
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/ai/providers/health';

describe('saúde operacional dos provedores', () => {
  beforeEach(clearProviderHealth);

  it('abre o circuito após duas falhas e permite nova tentativa depois da recuperação', () => {
    recordProviderFailure('groq', 'modelo', 'timeout', 1_000);
    expect(isProviderAvailable('groq', 1_001)).toBe(true);

    recordProviderFailure('groq', 'modelo', 'timeout', 2_000);
    expect(isProviderAvailable('groq', 2_001)).toBe(false);
    expect(getProviderHealth('groq', 2_001)).toMatchObject({ status: 'indisponivel', falhasConsecutivas: 2 });

    expect(isProviderAvailable('groq', 122_001)).toBe(true);
    expect(getProviderHealth('groq', 122_001).status).toBe('degradado');
  });

  it('registra sucesso, latência e modelo e fecha novamente o circuito', () => {
    recordProviderFailure('mistral', 'antigo', '404', 1_000);
    recordProviderFailure('mistral', 'antigo', '404', 2_000);
    recordProviderSuccess('mistral', 'novo', 84, 3_000);

    expect(getProviderHealth('mistral', 3_001)).toMatchObject({
      status: 'funcionando', modeloTestado: 'novo', latenciaMs: 84, falhasConsecutivas: 0,
    });
    expect(isProviderAvailable('mistral', 3_001)).toBe(true);
  });
});
