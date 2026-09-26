import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarFichas } from '@/lib/mbft/fichas';
import { buscarProjetosDeLei } from '@/lib/pdf/projetos-de-lei';
import { filterPII } from '@/lib/query/pii-filter';
import { validarCitacoes } from '@/lib/rag/pop';
import {
  montarFontes,
  palavrasChave,
  promptProfessor,
  sobreTransito,
  type FonteProfessor,
  type MensagemProfessor,
} from '@/lib/rag/professor';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { getJurisprudencia } from '@/lib/response/card-builder';
import { hybridSearch } from '@/lib/search/hybrid';

export type ProfessorErro = 'rate_limit_exceeded' | 'ip_blocked';

export interface RespostaProfessor {
  /** Null when no model answered: the sources are still returned */
  resposta: string | null;
  fontes: FonteProfessor[];
  modelo: string | null;
  aviso?: string;
}

const TEMPO_IA_MS = 30_000;

/** Never lets one source take the answer down */
async function semFalhar<T>(promessa: Promise<T>, vazio: T, nome: string): Promise<T> {
  try {
    return await promessa;
  } catch (error) {
    console.warn(`Professor: ${nome} unavailable:`, error);
    return vazio;
  }
}

/**
 * One turn of the conversation with the professor
 * @param pergunta - Question as typed
 * @param historico - Previous turns (the browser keeps them)
 * @param ip - Client IP (rate limit)
 */
export async function perguntarAoProfessor(
  pergunta: string,
  historico: MensagemProfessor[],
  ip: string
): Promise<{ resposta: RespostaProfessor } | { erro: ProfessorErro }> {
  const filtrada = filterPII(pergunta).trim();
  const conversa = historico.map((m) => ({ ...m, texto: filterPII(m.texto) }));

  const limite = await checkRateLimit(ip, { tipo: 'professor', pergunta: filtrada });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const inicio = Date.now();
  // Follow-ups ("e a multa?") need the subject of the previous question
  const contexto = [conversa.filter((m) => m.papel === 'agente').slice(-1)[0]?.texto ?? '', filtrada].join(' ').trim();

  const [ctb, projetos] = await Promise.all([
    semFalhar(hybridSearch(contexto, 5), [], 'CTB search'),
    semFalhar(buscarProjetosDeLei(palavrasChave(filtrada), 8), [], 'bills'),
  ]);
  const fichas = buscarFichas(contexto, 3);
  const normas = ctb.map((d) => ({ numero_dispositivo: d.numero_dispositivo, texto: d.texto, norma_id: '', tipo: 'lei', vigente: true }));
  const jurisprudencia = await semFalhar(getJurisprudencia(normas, filtrada, null), [], 'case law');

  const fontes = montarFontes({
    ctb,
    fichas,
    jurisprudencia,
    projetos: projetos.filter((p) => sobreTransito(p.ementa)).slice(0, 3),
  });

  const chain = new ProviderChain();
  let resposta: string | null = null;
  let modelo: string | null = null;
  let aviso: string | undefined;

  if (chain.ativos.length === 0) {
    aviso = 'Nenhum provedor de IA configurado: veja abaixo as fontes encontradas.';
  } else {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const gerada = await Promise.race([
        chain.generateRapido(promptProfessor(filtrada, conversa, fontes), 1400, 0.3),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
        }),
      ]);
      resposta = validarCitacoes(gerada.texto, fontes.length).texto || null;
      modelo = `${gerada.provedor} · ${gerada.modelo}`;
    } catch (error) {
      console.warn('Professor answer failed:', error);
      aviso = 'O professor não conseguiu responder agora. As fontes encontradas estão abaixo.';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  await recordQuery(
    ip,
    filtrada,
    { tipo: 'professor', sucesso: resposta !== null, tempoMs: Date.now() - inicio, modelo: modelo ?? 'database' },
    limite.registroId
  );
  return { resposta: { resposta, fontes, modelo, aviso } };
}
