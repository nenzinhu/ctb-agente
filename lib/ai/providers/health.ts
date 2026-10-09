export type ProviderOperationalStatus = 'funcionando' | 'degradado' | 'indisponivel' | 'nao_testado';

export interface ProviderHealth {
  status: ProviderOperationalStatus;
  modeloTestado: string | null;
  latenciaMs: number | null;
  ultimoTesteEm: string | null;
  ultimoErro: string | null;
  falhasConsecutivas: number;
  bloqueadoAte: string | null;
}

interface InternalHealth extends ProviderHealth {
  testedAtMs: number | null;
  blockedUntilMs: number | null;
}

const FAILURE_THRESHOLD = 2;
const RECOVERY_MS = 2 * 60_000;
const states = new Map<string, InternalHealth>();

const empty = (): InternalHealth => ({
  status: 'nao_testado', modeloTestado: null, latenciaMs: null, ultimoTesteEm: null,
  ultimoErro: null, falhasConsecutivas: 0, bloqueadoAte: null, testedAtMs: null, blockedUntilMs: null,
});

export function recordProviderSuccess(id: string, model: string, latencyMs: number, now = Date.now()): void {
  states.set(id, {
    status: 'funcionando', modeloTestado: model, latenciaMs: latencyMs,
    ultimoTesteEm: new Date(now).toISOString(), ultimoErro: null, falhasConsecutivas: 0,
    bloqueadoAte: null, testedAtMs: now, blockedUntilMs: null,
  });
}

export function recordProviderFailure(id: string, model: string, error: string, now = Date.now()): void {
  const previous = states.get(id) ?? empty();
  const failures = previous.falhasConsecutivas + 1;
  const blockedUntilMs = failures >= FAILURE_THRESHOLD ? now + RECOVERY_MS : null;
  states.set(id, {
    ...previous,
    status: blockedUntilMs ? 'indisponivel' : 'degradado',
    modeloTestado: model,
    ultimoTesteEm: new Date(now).toISOString(),
    ultimoErro: error,
    falhasConsecutivas: failures,
    bloqueadoAte: blockedUntilMs ? new Date(blockedUntilMs).toISOString() : null,
    testedAtMs: now,
    blockedUntilMs,
  });
}

export function isProviderAvailable(id: string, now = Date.now()): boolean {
  const state = states.get(id);
  return !state?.blockedUntilMs || state.blockedUntilMs <= now;
}

export function getProviderHealth(id: string, now = Date.now()): ProviderHealth {
  const state = states.get(id) ?? empty();
  if (state.blockedUntilMs && state.blockedUntilMs <= now && state.status === 'indisponivel') {
    return { ...state, status: 'degradado', bloqueadoAte: null };
  }
  return state;
}

export function providerHealthRank(id: string, now = Date.now()): number {
  const state = getProviderHealth(id, now);
  if (state.status === 'funcionando') return state.latenciaMs ?? Number.MAX_SAFE_INTEGER / 2;
  if (state.status === 'nao_testado') return Number.MAX_SAFE_INTEGER / 2;
  if (state.status === 'degradado') return Number.MAX_SAFE_INTEGER - 1;
  return Number.MAX_SAFE_INTEGER;
}

export function clearProviderHealth(): void {
  states.clear();
}
