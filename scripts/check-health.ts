// Post-deploy smoke check.
//
// Waits for the expected commit to be live, then asserts /api/health and the
// public routes. Exits non-zero on the first bad news, so CI (and anyone at a
// terminal) notices a broken deploy instead of finding out from a user.
//
// Usage:
//   node scripts/check-health.ts [--base=<url>] [--versao=<sha>] [--espera=<segundos>] [--intervalo=<segundos>]
//
// Environment fallbacks: SMOKE_BASE_URL, EXPECTED_VERSION, SMOKE_TIMEOUT_SECONDS.
import {
  ROTAS_PUBLICAS,
  problemasDaSaude,
  problemasDasRotas,
} from '../lib/health/smoke.ts';
import type { RespostaRota } from '../lib/health/smoke.ts';

const BASE_PADRAO = 'https://ctb-agente.vercel.app';
const REQUISICAO_MS = 10_000;

/**
 * Read `--nome=valor` from the command line
 * @param nome - Flag name without the dashes
 * @returns Value, or undefined when the flag was not passed
 */
function argumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(prefixo))
    ?.slice(prefixo.length);
}

const base = (argumento('base') ?? process.env.SMOKE_BASE_URL ?? BASE_PADRAO).replace(/\/+$/, '');
const versaoEsperada = argumento('versao') ?? process.env.EXPECTED_VERSION ?? undefined;
const limiteSegundos = Number(argumento('espera') ?? process.env.SMOKE_TIMEOUT_SECONDS ?? 180);
const intervaloSegundos = Number(argumento('intervalo') ?? 10);

const prazo = Date.now() + limiteSegundos * 1000;
const versaoCurta = versaoEsperada?.slice(0, 7);

/**
 * Fetch a URL as JSON, failing fast on a non-2xx response
 * @param url - Absolute URL
 * @returns Parsed JSON
 */
async function buscarJson(url: string): Promise<unknown> {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(REQUISICAO_MS) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

/**
 * Wait for the deployment to answer with the expected commit
 * @returns The health payload, or null when the wait ran out
 */
async function esperarDeploy(): Promise<unknown | null> {
  let ultimoErro = 'sem resposta';

  for (;;) {
    try {
      const payload = await buscarJson(`${base}/api/health`);
      const versao = (payload as { versao?: string } | null)?.versao;

      if (!versaoEsperada || versao === versaoCurta) return payload;
      ultimoErro = `ainda no commit ${versao ?? '?'}`;
    } catch (err) {
      ultimoErro = err instanceof Error ? err.message : String(err);
    }

    if (Date.now() >= prazo) {
      console.error(`❌ ${ultimoErro}`);
      return null;
    }

    console.log(
      `⏳ aguardando ${versaoCurta ?? 'a produção'} em ${base} (${ultimoErro})`
    );
    await new Promise((resolve) => setTimeout(resolve, intervaloSegundos * 1000));
  }
}

const problemas: string[] = [];

console.log(`🚦 Smoke check — ${base}${versaoCurta ? ` @ ${versaoCurta}` : ''}`);

const payload = await esperarDeploy();

if (!payload) {
  problemas.push(
    versaoCurta
      ? `/api/health não ficou na versão ${versaoCurta} em ${limiteSegundos}s`
      : `/api/health não respondeu em ${limiteSegundos}s`
  );
} else {
  const daSaude = problemasDaSaude(payload, versaoEsperada);
  problemas.push(...daSaude);
  console.log(
    daSaude.length === 0
      ? `✅ /api/health ok (versão ${String((payload as { versao?: string }).versao)})`
      : '❌ /api/health com problemas'
  );
}

const respostas: RespostaRota[] = [];

for (const rota of ROTAS_PUBLICAS) {
  try {
    const resposta = await fetch(`${base}${rota.caminho}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUISICAO_MS),
    });
    respostas.push({ caminho: rota.caminho, status: resposta.status });
  } catch {
    respostas.push({ caminho: rota.caminho, status: null });
  }
}

const dasRotas = problemasDasRotas(respostas);

for (const { caminho, status } of respostas) {
  const esperado = ROTAS_PUBLICAS.find((rota) => rota.caminho === caminho)?.status;
  console.log(`${status === esperado ? '✅' : '❌'} ${caminho} → HTTP ${status ?? 'sem resposta'}`);
}

problemas.push(...dasRotas);

if (problemas.length > 0) {
  console.error('\n❌ Deploy com problemas:');
  for (const problema of problemas) console.error(`   • ${problema}`);
  process.exitCode = 1;
} else {
  console.log('\n✅ Deploy saudável.');
}
