// Pure evaluation of the post-deploy health check.
// The runner (scripts/check-health.ts) does the I/O; the judgement lives here
// so it can be unit tested.

/** Public routes a healthy deployment answers without a session. */
export const ROTAS_PUBLICAS: ReadonlyArray<{ caminho: string; status: number }> = [
  { caminho: '/', status: 200 },
  { caminho: '/favoritos', status: 200 },
  { caminho: '/consulta', status: 200 },
  { caminho: '/gerador-pdf', status: 200 },
  // The master panel sits behind the auth middleware, so it redirects.
  { caminho: '/admin', status: 307 },
];

/** Health fields that must read "ok" for the deployment to be usable. */
const DEPENDENCIAS = ['banco', 'cache', 'embeddings'] as const;

/** One probed route: the HTTP status, or null when the request itself failed. */
export interface RespostaRota {
  caminho: string;
  status: number | null;
}

/**
 * Compare the /api/health payload with what a working deployment reports
 * @param payload - Parsed JSON from /api/health, or anything else that came back
 * @param versaoEsperada - Commit SHA the deployment is supposed to be running
 * @returns Human-readable problems; empty when the deployment is healthy
 */
export function problemasDaSaude(payload: unknown, versaoEsperada?: string): string[] {
  if (!payload || typeof payload !== 'object') {
    return ['/api/health não devolveu JSON'];
  }

  const dados = payload as Record<string, unknown>;
  const problemas: string[] = [];

  if (dados.status !== 'ok') {
    problemas.push(`/api/health respondeu status "${String(dados.status)}"`);
  }

  for (const dependencia of DEPENDENCIAS) {
    if (dados[dependencia] !== 'ok') {
      problemas.push(`${dependencia}: ${String(dados[dependencia])}`);
    }
  }

  if (versaoEsperada) {
    const curta = versaoEsperada.slice(0, 7);
    if (dados.versao !== curta) {
      problemas.push(`no ar a versão "${String(dados.versao)}", esperada "${curta}"`);
    }
  }

  return problemas;
}

/**
 * Compare the probed routes with the expected status codes
 * @param respostas - What each route answered
 * @param esperadas - Routes and statuses the deployment must satisfy
 * @returns Human-readable problems; empty when every route behaved
 */
export function problemasDasRotas(
  respostas: RespostaRota[],
  esperadas: ReadonlyArray<{ caminho: string; status: number }> = ROTAS_PUBLICAS
): string[] {
  const problemas: string[] = [];

  for (const esperada of esperadas) {
    const resposta = respostas.find((item) => item.caminho === esperada.caminho);

    if (!resposta) {
      problemas.push(`${esperada.caminho}: não verificado`);
    } else if (resposta.status !== esperada.status) {
      problemas.push(
        `${esperada.caminho}: HTTP ${resposta.status ?? 'sem resposta'} (esperado ${esperada.status})`
      );
    }
  }

  return problemas;
}
