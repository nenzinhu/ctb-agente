import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarFichas } from '@/lib/mbft/fichas';
import { buscarPops } from '@/lib/pop/pops';
import { buscarProjetosDeLei } from '@/lib/pdf/projetos-de-lei';
import { filterPII } from '@/lib/query/pii-filter';
import { codigoMbft } from '@/lib/query/router';
import { fontesDosPops, validarCitacoes } from '@/lib/rag/pop';
import {
  montarFontes,
  palavrasChave,
  promptProfessor,
  sobreTransito,
  type FonteProfessor,
  type ComparacaoInfracao,
  type MensagemProfessor,
  type ModoProfessor,
  type OpcaoEsclarecimento,
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
  /** True when the answer was assembled directly from official sources. */
  local?: boolean;
  esclarecimento?: { pergunta: string; opcoes: OpcaoEsclarecimento[] };
  comparacao?: ComparacaoInfracao[];
  aviso?: string;
}

const TEMPO_IA_MS = 15_000;
const TEMPO_FONTE_EXTERNA_MS = 2_000;

/** Never lets one source take the answer down */
async function semFalhar<T>(promessa: Promise<T>, vazio: T, nome: string): Promise<T> {
  try {
    return await promessa;
  } catch (error) {
    console.warn(`Professor: ${nome} unavailable:`, error);
    return vazio;
  }
}

async function comPrazo<T>(promessa: Promise<T>, ms: number, nome: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promessa,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${nome} excedeu ${ms} ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const pedeJurisprudencia = (texto: string) =>
  /jurisprud|decis[aã]o judicial|tribunal|\bSTF\b|\bSTJ\b|s[uú]mula/i.test(texto);

const pedeProjeto = (texto: string) =>
  /projeto de lei|\bPL\s*\d|tramita|tramita[cç][aã]o|proposta (?:para|de) mudar/i.test(texto);

const pareceDuvidaDePop = (texto: string) => {
  const simples = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /\bpop\b|procedimento|como (?:fazer|realizar|proceder)|abordagem|busca pessoal|revista pessoal|baculejo|algema|barreira policial|\bblitz\b|ocorrencia policial|prisao|conducao|uso progressivo|violencia domestica/.test(simples);
};

function consultaFocadaDoPop(texto: string): string {
  const simples = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const conceito = simples.match(
    /busca pessoal|revista pessoal|baculejo|uso de algema|usar algema|algema|violencia domestica|maria da penha|barreira policial|blitz|abordagem policial com cao|abordagem policial/
  )?.[0];
  return conceito ?? texto;
}

function fichasDaSimulacao(texto: string): ReturnType<typeof buscarFichas> {
  const simples = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // “Usando o celular” lacks the fact that separates the two MBFT sheets.
  // Retrieve both so the simulator asks what the agent actually observed.
  if (/celular|telefone/.test(simples) && !/segur|manuse|orelha|fone/.test(simples)) {
    const candidatas = [
      ...buscarFichas('dirigir segurando telefone celular', 2),
      ...buscarFichas('dirigir manuseando telefone celular', 2),
    ];
    return candidatas.filter((ficha, indice, todas) =>
      todas.findIndex((outra) => outra.codigo === ficha.codigo) === indice
    ).slice(0, 4);
  }
  return buscarFichas(texto, 4);
}

function descricaoSuficienteParaSimular(texto: string): boolean {
  if (codigoMbft(texto)) return true;
  const simples = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termos = simples.split(/[^a-z0-9]+/).filter((termo) => termo.length >= 3);
  return termos.length >= 6 || /celular|telefone|cinto|alcool|bafometro|veloc|estacion|calcada|habilit|\bcnh\b|placa|capacete|documento|farol|pneu|semaforo|sinal vermelho|contramao|ultrapass/.test(simples);
}

const resumir = (texto: string, limite = 420) =>
  texto.length > limite ? `${texto.slice(0, limite).replace(/\s+\S*$/, '')}…` : texto;

/** Useful answer even when no model is configured or the provider times out. */
function respostaDasFontes(fontes: FonteProfessor[]): string | null {
  const ficha = fontes.find((fonte) => fonte.tipo === 'mbft');
  if (ficha) {
    const linhas = ficha.texto.split('\n').filter(Boolean);
    return [
      `A ficha oficial mais relacionada é **${ficha.titulo}** [${ficha.n}].`,
      ...linhas.slice(0, 3).map((linha) => `- ${resumir(linha, 300)}`),
      'Confira a situação concreta e os campos “quando autuar” e “quando não autuar” antes de concluir o enquadramento.',
    ].join('\n');
  }

  const pop = fontes.find((fonte) => fonte.tipo === 'pop');
  if (pop) {
    const passos = pop.texto.split('\n').map((linha) => linha.trim()).filter(Boolean).slice(0, 5);
    return [
      `O procedimento oficial mais relacionado é **${pop.titulo}** [${pop.n}].`,
      ...passos.map((passo, indice) => `${indice + 1}. ${resumir(passo, 260)}`),
    ].join('\n');
  }

  const ctb = fontes.find((fonte) => fonte.tipo === 'ctb');
  if (ctb) {
    return `O dispositivo mais relacionado é **${ctb.titulo}** [${ctb.n}].\n\n${resumir(ctb.texto)}`;
  }
  return null;
}

function codigosParaComparar(texto: string): string[] {
  if (!/compar|diferen[cç]a|distinguir|versus|\bvs\.?\b/i.test(texto)) return [];
  return [...texto.matchAll(/\b(\d{3})\s*-?\s*(\d{2})\b/g)]
    .map((resultado) => `${resultado[1]}-${resultado[2]}`)
    .filter((codigo, indice, todos) => todos.indexOf(codigo) === indice)
    .slice(0, 4);
}

const comparacaoDasFichas = (fichas: ReturnType<typeof buscarFichas>): ComparacaoInfracao[] =>
  fichas.map((ficha) => ({
    codigo: ficha.codigo,
    descricao: ficha.tipificacaoResumida,
    amparo: ficha.amparoLegal,
    gravidade: ficha.gravidade,
    pontos: ficha.pontuacao,
    penalidade: ficha.penalidade,
    medida: ficha.medidaAdministrativa,
    quandoAutuar: resumir(ficha.quandoAutuar[0] ?? ficha.tipificacao, 360),
  }));

function esclarecimentoDasFichas(
  fichas: ReturnType<typeof buscarFichas>,
  simulador: boolean
): RespostaProfessor['esclarecimento'] | undefined {
  if (fichas.length < 2) return undefined;
  return {
    pergunta: simulador
      ? 'Qual destas situações descreve melhor a ocorrência observada?'
      : 'Encontrei mais de um enquadramento possível. Qual situação é a correta?',
    opcoes: fichas.slice(0, 4).map((ficha) => ({
      valor: ficha.codigo,
      titulo: `${ficha.codigo} — ${ficha.tipificacaoResumida}`,
      descricao: `${ficha.amparoLegal} · ${ficha.gravidade} · ${resumir(ficha.quandoAutuar[0] ?? ficha.tipificacao, 220)}`,
    })),
  };
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
  ip: string,
  modo: ModoProfessor = 'auto'
): Promise<{ resposta: RespostaProfessor } | { erro: ProfessorErro }> {
  const filtrada = filterPII(pergunta).trim();
  const conversa = historico.map((m) => ({ ...m, texto: filterPII(m.texto) }));

  const limite = await checkRateLimit(ip, { tipo: 'professor', pergunta: filtrada });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const inicio = Date.now();
  // Follow-ups ("e a multa?") need the subject of the previous question
  const contexto = [conversa.filter((m) => m.papel === 'agente').slice(-1)[0]?.texto ?? '', filtrada].join(' ').trim();

  const codigosComparacao = modo !== 'pop' ? codigosParaComparar(filtrada) : [];
  if (codigosComparacao.length >= 2) {
    const fichasComparadas = codigosComparacao.flatMap((codigo) => buscarFichas(codigo, 1));
    if (fichasComparadas.length >= 2) {
      const fontes = montarFontes({ ctb: [], fichas: fichasComparadas, pops: [], jurisprudencia: [], projetos: [] });
      const comparacao = comparacaoDasFichas(fichasComparadas);
      const resposta = `Comparei **${comparacao.map((item) => item.codigo).join(' × ')}**. Veja abaixo as diferenças de enquadramento, gravidade, pontos e medida administrativa.`;
      await recordQuery(ip, filtrada, { tipo: 'professor', sucesso: true, tempoMs: Date.now() - inicio, modelo: 'comparador-local' }, limite.registroId);
      return { resposta: { resposta, fontes, modelo: 'Comparador oficial local', local: true, comparacao } };
    }
  }

  // Separate the two corpora before ranking. Operational vocabulary selects
  // POP; otherwise legal/infraction questions select MBFT. This prevents a
  // weak match in one manual from outranking a strong match in the other.
  const consultaPop = modo === 'pop' || (modo === 'auto' && pareceDuvidaDePop(contexto));
  const consultaInfracao = modo === 'infracao' || modo === 'simulador' || modo === 'auto';
  const simulacaoVaga = modo === 'simulador' && !descricaoSuficienteParaSimular(contexto);
  const fichas = consultaPop || modo === 'ctb'
    ? []
    : modo === 'simulador'
      ? (simulacaoVaga ? [] : fichasDaSimulacao(contexto))
      : consultaInfracao ? buscarFichas(contexto, 4) : [];
  const pops = consultaPop ? buscarPops(consultaFocadaDoPop(contexto), 3) : [];
  if (modo === 'simulador' && fichas.length === 0) {
    const resposta = [
      'Ainda não há fatos suficientes para indicar uma ficha com segurança.',
      '- Qual foi exatamente a ação observada?',
      '- O veículo estava em movimento, parado ou estacionado?',
      '- Qual era o local, a sinalização e a condição da via?',
      '- Havia documento, equipamento, passageiro ou outra circunstância relevante?',
    ].join('\n');
    await recordQuery(ip, filtrada, { tipo: 'professor', sucesso: true, tempoMs: Date.now() - inicio, modelo: 'simulador-local' }, limite.registroId);
    return { resposta: { resposta, fontes: [], modelo: 'Simulador local', local: true } };
  }
  // A hit in either bundled official manual is immediate and avoids waiting
  // for embeddings/database. General CTB questions still use hybrid RAG.
  const precisaBancoCtb = modo === 'ctb' || (modo === 'auto' && fichas.length === 0 && pops.length === 0);
  const [ctb, projetos] = await Promise.all([
    precisaBancoCtb ? semFalhar(hybridSearch(contexto, 5), [], 'CTB search') : Promise.resolve([]),
    pedeProjeto(filtrada)
      ? semFalhar(comPrazo(buscarProjetosDeLei(palavrasChave(filtrada), 8), TEMPO_FONTE_EXTERNA_MS, 'Câmara'), [], 'bills')
      : Promise.resolve([]),
  ]);
  const normas = ctb.map((d) => ({ numero_dispositivo: d.numero_dispositivo, texto: d.texto, norma_id: '', tipo: 'lei', vigente: true }));
  const normasParaJurisprudencia = [
    ...normas,
    ...fichas.map((f) => ({ numero_dispositivo: f.amparoLegal, texto: f.tipificacao, norma_id: '', tipo: 'manual', vigente: true })),
  ];
  const jurisprudencia = pedeJurisprudencia(filtrada)
    ? await semFalhar(comPrazo(getJurisprudencia(normasParaJurisprudencia, filtrada, null), TEMPO_FONTE_EXTERNA_MS, 'jurisprudência'), [], 'case law')
    : [];

  const fontes = montarFontes({
    ctb,
    fichas,
    pops: fontesDosPops(pops, 2, contexto),
    jurisprudencia,
    projetos: projetos.filter((p) => sobreTransito(p.ementa)).slice(0, 3),
  });
  const esclarecimento = !codigoMbft(filtrada)
    ? esclarecimentoDasFichas(fichas, modo === 'simulador')
    : undefined;

  const chain = new ProviderChain();
  let resposta: string | null = null;
  let modelo: string | null = null;
  let local = false;
  let aviso: string | undefined;

  if (chain.ativos.length === 0) {
    resposta = respostaDasFontes(fontes);
    local = resposta !== null;
    modelo = local ? 'Base oficial local' : null;
    aviso = local
      ? 'Resposta rápida montada diretamente das fontes oficiais, sem IA.'
      : 'Nenhum provedor de IA configurado e nenhuma fonte suficiente foi encontrada.';
  } else {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const gerada = await Promise.race([
        chain.generateRapido(promptProfessor(filtrada, conversa, fontes), 900, 0.2),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
        }),
      ]);
      resposta = validarCitacoes(gerada.texto, fontes.length).texto || null;
      modelo = `${gerada.provedor} · ${gerada.modelo}`;
    } catch (error) {
      console.warn('Professor answer failed:', error);
      resposta = respostaDasFontes(fontes);
      local = resposta !== null;
      modelo = local ? 'Base oficial local' : null;
      aviso = local
        ? 'O provedor demorou ou falhou; foi usada uma resposta rápida das fontes oficiais.'
        : 'O professor não conseguiu responder agora. As fontes encontradas estão abaixo.';
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
  return { resposta: { resposta, fontes, modelo, local, aviso, esclarecimento } };
}
