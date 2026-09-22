// Build structured response cards
import { databaseConfigured, supabase } from '@/lib/db/client';
import type { Dispositivo, Enquadramento, Jurisprudencia } from '@/lib/db/schema';
import type {
  CartaoEstruturado,
  NormaAplicavel,
  ResponseCitation,
  TipoConsulta,
} from './response-types';
import { validateCitations } from './validator';
import { formatarMulta, labelDocumento } from './format';

const TRECHO_MAX = 300;

/**
 * Card returned when the database has nothing relevant for the query
 * @param consulta - Original query
 * @param tipo - Query classification
 * @returns Empty but well-formed card
 */
export function emptyCard(consulta: string, tipo: TipoConsulta): CartaoEstruturado {
  return {
    tipo,
    sucesso: false,
    consulta,
    enquadramento: null,
    normas: [],
    checklist_ait: [],
    erros_comuns: [],
    concurso_infrações: [],
    crime_transito: false,
    categoria_cnh_exigida: 'desconhecida',
    normas_relacionadas: [],
    jurisprudencia: [],
    explicacao_simples:
      'Não encontrei essa infração na base. Confira o código/artigo digitado ou cadastre o documento no painel admin.',
    exemplo_dia_a_dia: '',
    citacoes: [],
    cache_hit: false,
    tempo_ms: 0,
  };
}

/**
 * Normalize a database or search row into an applicable norm
 * @param row - Row coming from `dispositivos` or from the hybrid search
 * @returns Normalized norm
 */
function toNorma(row: any): NormaAplicavel {
  const fim = row?.data_vigencia_fim ?? null;
  return {
    numero_dispositivo: String(row?.numero_dispositivo ?? ''),
    texto: String(row?.texto ?? ''),
    norma_id: String(row?.norma_id ?? 'ctb-lei-9503-97'),
    tipo: String(row?.tipo ?? 'lei'),
    vigente: fim === null,
  };
}

/**
 * Build a card for an enforcement code lookup (e.g. "516-91")
 * @param enquadramento - Row from the `enquadramentos` table
 * @param consulta - Original query
 * @param normas - Legal provisions retrieved for this code
 * @returns Structured card
 */
export async function buildCardFromEnquadramento(
  enquadramento: Enquadramento,
  consulta: string,
  normas: NormaAplicavel[] = []
): Promise<CartaoEstruturado> {
  const codigo = enquadramento.codigo_mbft;
  const citacoes = buildCitations(normas, enquadramento.amparo_legal);
  const jurisprudencia = await getJurisprudencia(normas, codigo, enquadramento);

  return {
    tipo: 'codigo',
    sucesso: true,
    consulta,
    enquadramento,
    normas,
    checklist_ait: generateChecklistAIT(enquadramento),
    erros_comuns: generateErrosComuns(enquadramento),
    concurso_infrações: [],
    crime_transito: detectCrimeTransito(enquadramento),
    categoria_cnh_exigida: getCategoriaCNH(enquadramento),
    normas_relacionadas: normas.map((n) => n.numero_dispositivo).filter(Boolean),
    jurisprudencia,
    explicacao_simples: buildExplicacaoSimples(enquadramento),
    exemplo_dia_a_dia: buildExemplo(enquadramento),
    citacoes,
    cache_hit: false,
    tempo_ms: 0,
  };
}

/**
 * Build a card for article or situation lookups, where no MBFT code is known
 * @param rows - Retrieved provisions (most relevant first)
 * @param consulta - Original query
 * @param tipo - Query classification
 * @returns Structured card
 */
export async function buildCardFromNormas(
  rows: any[],
  consulta: string,
  tipo: TipoConsulta
): Promise<CartaoEstruturado> {
  const normas = rows.map(toNorma).filter((n) => n.numero_dispositivo);
  if (normas.length === 0) {
    return emptyCard(consulta, tipo);
  }

  const jurisprudencia = await getJurisprudencia(normas, consulta, null);
  const card: CartaoEstruturado = {
    tipo,
    sucesso: true,
    consulta,
    enquadramento: null,
    normas,
    checklist_ait: generateChecklistGenerico(),
    erros_comuns: [],
    concurso_infrações: [],
    crime_transito: normas.some((n) => /art\.\s*(30[2-9]|31[0-2])/.test(n.texto)),
    categoria_cnh_exigida: 'desconhecida',
    normas_relacionadas: normas.map((n) => n.numero_dispositivo),
    jurisprudencia,
    explicacao_simples: buildExplicacaoDeNormas(normas),
    exemplo_dia_a_dia: '',
    citacoes: buildCitations(normas),
    cache_hit: false,
    tempo_ms: 0,
  };

  return card;
}

/**
 * Build a structured card for an enforcement code, querying the database
 * @param codigoMBFT - MBFT enforcement code (e.g. "516-91")
 * @param retrievedChunks - Relevant legal text chunks retrieved from search
 * @returns Structured response card
 */
export async function buildCard(
  codigoMBFT: string,
  retrievedChunks: any[]
): Promise<CartaoEstruturado> {
  const { data: enquadramento, error } = await supabase
    .from('enquadramentos')
    .select('*')
    .eq('codigo_mbft', codigoMBFT)
    .single();

  if (error || !enquadramento) {
    return emptyCard(codigoMBFT, 'codigo');
  }

  return buildCardFromEnquadramento(
    enquadramento as Enquadramento,
    codigoMBFT,
    retrievedChunks.map(toNorma)
  );
}

/**
 * AIT (Auto de Infração de Trânsito) checklist tailored to one enquadramento
 * @param enquadramento - Infraction details
 * @returns Checklist items, in the order the agent should check them
 */
export function generateChecklistAIT(enquadramento: Enquadramento): string[] {
  const items = [
    '[ ] Confirmar local, data e hora exata da abordagem',
    '[ ] Descrever a conduta na forma exata do dispositivo enquadrado',
    '[ ] Identificar condutor (CNH) e veículo (placa, chassi, marca/modelo)',
  ];

  if (enquadramento.retem_veiculo) {
    items.push('[ ] Registrar a retenção e entregar comprovante ao condutor');
  }

  if (enquadramento.remove_veiculo) {
    items.push('[ ] Conferir o chassi antes da remoção e lavrar o auto de remoção');
  }

  const documento = labelDocumento(enquadramento.recolhe_documento);
  if (documento) {
    items.push(`[ ] Recolher ${documento} e emitir recibo de recolhimento`);
  }

  items.push(`[ ] Citar o amparo legal no campo de enquadramento (${enquadramento.amparo_legal})`);
  items.push('[ ] Fotografar a evidência e a sinalização do local');

  return items;
}

/**
 * Generic checklist used when the query is an article or a described situation
 * @returns Checklist items
 */
export function generateChecklistGenerico(): string[] {
  return [
    '[ ] Confirmar local, data e hora exata da abordagem',
    '[ ] Identificar o dispositivo legal que se aplica ao caso concreto',
    '[ ] Identificar condutor (CNH) e veículo (placa, chassi, marca/modelo)',
    '[ ] Fotografar a evidência e a sinalização do local',
    '[ ] Registrar a medida administrativa cabível (retenção, remoção, recolhimento)',
  ];
}

/**
 * Common mistakes made when filing an AIT for this infraction
 * @param enquadramento - Infraction details
 * @returns Common mistake descriptions
 */
export function generateErrosComuns(enquadramento: Enquadramento): string[] {
  const erros = [
    '❌ Não descrever a conduta nos termos do dispositivo enquadrado',
    '❌ Divergência entre o horário registrado e o horário da abordagem',
  ];

  if (enquadramento.remove_veiculo) {
    erros.push('❌ Remover o veículo sem lavrar o auto de remoção ou sem conferir o chassi');
  }

  if (enquadramento.recolhe_documento) {
    erros.push('❌ Recolher documento sem emitir recibo ao condutor');
  }

  if (enquadramento.valor_multa === 0) {
    erros.push('⚠️ Valor de multa não cadastrado — conferir a tabela vigente antes de lavrar');
  }

  return erros;
}

/**
 * Detect whether the infraction can also be framed as a traffic crime.
 * Only arts. 302-312 of the CTB describe traffic crimes.
 * @param enquadramento - Infraction details
 * @returns True when a crime article is referenced
 */
export function detectCrimeTransito(enquadramento: Enquadramento): boolean {
  return /art\.?\s*(30[2-9]|31[0-2])/i.test(enquadramento.amparo_legal || '');
}

/**
 * Required driver's license category, derived from the infraction text
 * @param enquadramento - Infraction details
 * @returns CNH category
 */
export function getCategoriaCNH(enquadramento: Enquadramento): string {
  const texto = `${enquadramento.descricao} ${enquadramento.amparo_legal}`.toLowerCase();
  if (/(motociclet|ciclomotor|motoneta|duas rodas|guidom)/.test(texto)) return 'A';
  if (/(ônibus|onibus|coletivo|passageiros|caminhão|caminhao|reboque|trator)/.test(texto)) return 'C/D/E';
  return 'qualquer';
}

/**
 * Build citations from the norms actually retrieved from the database
 * @param normas - Retrieved provisions
 * @param amparoLegal - Amparo legal string from the enquadramento, if any
 * @returns Citations, filtered so that no unverified reference survives
 */
export function buildCitations(
  normas: NormaAplicavel[],
  amparoLegal?: string
): ResponseCitation[] {
  const citacoes: ResponseCitation[] = normas
    .filter((n) => n.texto)
    .map((n) => ({
      trecho:
        n.texto.length > TRECHO_MAX ? `${n.texto.slice(0, TRECHO_MAX).trim()}…` : n.texto,
      dispositivo: n.numero_dispositivo,
      validada: true,
    }));

  if (amparoLegal && !citacoes.some((c) => c.dispositivo === amparoLegal)) {
    const norma = findNormaForAmparoLegal(normas, amparoLegal);
    citacoes.push({
      trecho: norma?.texto
        ? norma.texto.length > TRECHO_MAX
          ? `${norma.texto.slice(0, TRECHO_MAX).trim()}…`
          : norma.texto
        : 'Dispositivo apontado pelo enquadramento (texto não cadastrado na base).',
      dispositivo: amparoLegal,
      validada: Boolean(norma),
    });
  }

  return filterValidCitations(citacoes, normas);
}

/**
 * Try to locate the retrieved norm that backs an amparo legal string
 * @param normas - Retrieved provisions
 * @param amparoLegal - Amparo legal string (e.g. "art. 181 XVII do CTB")
 * @returns Matching norm, if any
 */
export function findNormaForAmparoLegal(
  normas: NormaAplicavel[],
  amparoLegal: string
): NormaAplicavel | undefined {
  const alvo = amparoLegal.toLowerCase();
  const artigo = alvo.match(/art\.?\s*\d+/)?.[0];
  return normas.find((n) => alvo.includes(n.numero_dispositivo.toLowerCase())) ??
    (artigo
      ? normas.find((n) => n.numero_dispositivo.toLowerCase().includes(artigo))
      : undefined);
}

/**
 * Drop citations that claim to be verified but are not backed by the retrieved norms.
 * Citations explicitly marked as unverified are kept: the UI shows them with a
 * warning, which is more useful to an agent than silently hiding the reference.
 * @param citacoes - Candidate citations
 * @param normas - Retrieved provisions
 * @returns Citations safe to display
 */
export function filterValidCitations(
  citacoes: ResponseCitation[],
  normas: NormaAplicavel[]
): ResponseCitation[] {
  // Kept for the transparency of the validation step (logged by callers)
  validateCitations(JSON.stringify(citacoes), normas);

  return citacoes.filter((c) => (c.validada ? isBackedByNormas(c.dispositivo, normas) : true));
}

/**
 * Check whether a reference is present in the retrieved norms
 * @param dispositivo - Reference such as "art. 181 XX do CTB"
 * @param normas - Retrieved provisions
 * @returns True when some norm matches the reference
 */
export function isBackedByNormas(
  dispositivo: string,
  normas: NormaAplicavel[]
): boolean {
  const alvo = dispositivo.toLowerCase().replace(/\s*do ctb\s*$/, '').trim();
  if (!alvo) return false;

  return normas.some((n) => {
    const numero = n.numero_dispositivo.toLowerCase();
    return numero.includes(alvo) || alvo.includes(numero);
  });
}

/**
 * Fetch jurisprudence registered for the theme / cited devices
 * @param normas - Retrieved provisions (used to guess related devices)
 * @param _consulta - Original query or MBFT code (theme guess)
 * @param enquadramento - Infraction details, when available
 * @returns Registered decisions, empty when none is registered
 */
export async function getJurisprudencia(
  normas: NormaAplicavel[],
  _consulta: string,
  enquadramento: Enquadramento | null
): Promise<Jurisprudencia[]> {
  const dispositivos = new Set<string>(
    normas.map((n) => n.numero_dispositivo).filter(Boolean)
  );
  if (enquadramento?.amparo_legal) {
    dispositivos.add(enquadramento.amparo_legal);
  }

  const chaves = [...dispositivos]
    .map((d) => d.match(/art\.?\s*\d+/i)?.[0])
    .filter((v): v is string => Boolean(v));

  if (chaves.length === 0 || !databaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('jurisprudencia')
      .select('*')
      .overlaps('dispositivos_relacionados', chaves)
      .limit(10);

    if (error || !data) {
      return [];
    }
    return data as Jurisprudencia[];
  } catch (error) {
    console.error('Failed to load jurisprudence:', error);
    return [];
  }
}

/**
 * Deterministic plain-language summary derived from the enquadramento.
 * Marked as automatic so the agent never mistakes it for legal advice.
 * @param enquadramento - Infraction details
 * @returns Plain-language explanation
 */
export function buildExplicacaoSimples(enquadramento: Enquadramento): string {
  const multa = formatarMulta(enquadramento.valor_multa);
  const consequencias: string[] = [];
  if (enquadramento.recolhe_documento) {
    consequencias.push('recolhimento de documento');
  }
  if (enquadramento.retem_veiculo) {
    consequencias.push('retenção do veículo');
  }
  if (enquadramento.remove_veiculo) {
    consequencias.push('remoção do veículo');
  }

  const medidas =
    consequencias.length > 0
      ? ` Além da multa, a infração prevê ${consequencias.join(', ')}.`
      : ' A infração não prevê medida administrativa além da multa.';

  return (
    `${lowerFirst(enquadramento.descricao)}, previsto em ${enquadramento.amparo_legal}. ` +
    `É infração de gravidade ${enquadramento.gravidade}, vale ${enquadramento.pontos} ponto(s) na CNH e multa de ${multa} ` +
    `(${enquadramento.unidade}).${medidas} ` +
    'Resumo gerado automaticamente a partir da base legal — confirme a redação vigente antes de fundamentar o AIT.'
  );
}

/**
 * Plain-language explanation for lookups that returned only norms
 * @param normas - Retrieved provisions
 * @returns Plain-language explanation
 */
export function buildExplicacaoDeNormas(normas: NormaAplicavel[]): string {
  const lista = normas.map((n) => n.numero_dispositivo).join(', ');
  return (
    `Estes são os dispositivos da base mais próximos da sua consulta: ${lista}. ` +
    'O trecho integral de cada um está em "Fontes e citações". ' +
    'Use o texto legal como base do enquadramento e confirme a redação vigente na fonte oficial.'
  );
}

/**
 * Illustrative everyday scenario, always labelled as illustrative
 * @param enquadramento - Infraction details
 * @returns Scenario text
 */
export function buildExemplo(enquadramento: Enquadramento): string {
  const medida = enquadramento.remove_veiculo
    ? 'O agente confere o chassi, lavra o auto de remoção e libera o guincho apenas com o comprovante assinado.'
    : enquadramento.recolhe_documento
      ? 'O agente recolhe o documento indicado, emite o recibo e orienta o condutor sobre a regularização.'
      : 'O agente registra os dados no AIT, entrega a via ao condutor e explica o prazo para defesa.';

  return (
    `Cenário ilustrativo (não é jurisprudência): abordagem de rotina em que a conduta descrita em ` +
    `${enquadramento.amparo_legal} é flagrada — "${lowerFirst(enquadramento.descricao)}". ${medida}`
  );
}

/**
 * Lowercase only the first character of a string
 * @param value - Input string
 * @returns String with a lowercase first character
 */
function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * Convert a `dispositivos` row into a norm row, exported for reuse
 * @param dispositivo - Device row
 * @returns Normalized norm
 */
export function dispositivoToNorma(dispositivo: Dispositivo): NormaAplicavel {
  return toNorma(dispositivo);
}
