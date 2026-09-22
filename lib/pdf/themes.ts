// Thematic dossiers for PDF generation

export interface PDFTheme {
  id: string;
  label: string;
  /** MBFT code prefixes that belong to the theme */
  codigos: string[];
  /** Free-text keywords used for full-text search over the corpus */
  keywords: string[];
  /** Optional article of the CTB that anchors the theme */
  artigo?: string;
}

export interface SecoesDossie {
  normas: boolean;
  enquadramentos: boolean;
  procedimento: boolean;
  exemplos: boolean;
  jurisprudencia: boolean;
  projetosDeLei: boolean;
}

export const SECOES_PADRAO: SecoesDossie = {
  normas: true,
  enquadramentos: true,
  procedimento: true,
  exemplos: true,
  jurisprudencia: true,
  projetosDeLei: false,
};

export const SECOES_LABELS: Record<keyof SecoesDossie, string> = {
  normas: 'Normas aplicáveis',
  enquadramentos: 'Enquadramentos (cartões)',
  procedimento: 'Diretrizes de procedimento e checklist do AIT',
  exemplos: 'Exemplos do dia a dia',
  jurisprudencia: 'Jurisprudência',
  projetosDeLei: 'Projetos de lei em tramitação',
};

export const THEMES: PDFTheme[] = [
  {
    id: 'alcoolemia',
    label: 'Alcoolemia e direção sob influência',
    codigos: ['737', '738', '739'],
    keywords: ['alcoolemia', 'alcool', 'embriaguez', 'bafometro', 'recusa', 'art. 165'],
    artigo: 'art. 165',
  },
  {
    id: 'estacionamento',
    label: 'Estacionamento e parada',
    codigos: ['516', '517', '518', '552', '553'],
    keywords: ['estacionar', 'estacionamento', 'parada', 'vaga', 'idoso', 'deficiente', 'art. 181', 'art. 182'],
    artigo: 'art. 181',
  },
  {
    id: 'velocidade',
    label: 'Velocidade',
    codigos: ['745', '746', '747'],
    keywords: ['velocidade', 'limite', 'radar', 'art. 218', 'art. 219'],
    artigo: 'art. 218',
  },
  {
    id: 'documentos',
    label: 'Documentação e licenciamento',
    codigos: ['678', '679', '680', '681'],
    keywords: ['cnh', 'crlv', 'licenciamento', 'documento', 'habilitacao', 'art. 162', 'art. 230'],
    artigo: 'art. 230',
  },
  {
    id: 'equipamentos',
    label: 'Equipamentos obrigatórios',
    codigos: ['628', '629', '630', '631'],
    keywords: ['equipamento', 'obrigatorio', 'pneu', 'farol', 'espelho', 'cinto', 'art. 230'],
    artigo: 'art. 105',
  },
  {
    id: 'art-165',
    label: 'Artigo 165 (infrações correlatas)',
    codigos: ['737'],
    keywords: ['art. 165', 'art. 165-A', 'recusa', 'teste do bafometro'],
    artigo: 'art. 165',
  },
];

/**
 * Find a theme by id
 * @param themeId - Theme identifier
 * @returns Theme or null
 */
export function getTheme(themeId: string): PDFTheme | null {
  return THEMES.find((t) => t.id === themeId) ?? null;
}

/**
 * Keep only the enquadramentos that belong to the theme
 * @param enquadramentos - Rows from the `enquadramentos` table
 * @param themeId - Theme identifier
 * @returns Filtered rows (empty when the theme is unknown)
 */
export function filterByTheme(enquadramentos: any[], themeId: string): any[] {
  const theme = getTheme(themeId);
  if (!theme) return [];

  return enquadramentos.filter((e) =>
    theme.codigos.some((codigo) => String(e?.codigo_mbft ?? '').startsWith(codigo))
  );
}

/**
 * Cache key for a dossiê request. Kept pure (no database access) so it can be
 * unit tested and reused from the client if needed.
 * @param themeId - Theme identifier
 * @param secoes - Requested sections
 * @param versaoBase - Corpus version
 * @returns Key stored in `cache_respostas.hash_pergunta`
 */
export function buildPdfCacheKey(
  themeId: string,
  secoes: SecoesDossie,
  versaoBase: string
): string {
  const assinaturaSecoes = Object.entries(secoes)
    .filter(([, ativo]) => ativo)
    .map(([chave]) => chave)
    .sort()
    .join('+');
  return `pdf:${themeId}:${assinaturaSecoes}:${versaoBase}`;
}

/**
 * Sections requested by the client, filled with defaults and ignoring unknown keys
 * @param input - Raw payload from the request
 * @returns Sanitized section flags
 */
export function normalizeSecoes(input?: Partial<SecoesDossie> | null): SecoesDossie {
  const secoes = { ...SECOES_PADRAO };
  if (!input || typeof input !== 'object') return secoes;

  for (const chave of Object.keys(SECOES_PADRAO) as (keyof SecoesDossie)[]) {
    if (typeof input[chave] === 'boolean') {
      secoes[chave] = input[chave] as boolean;
    }
  }

  return secoes;
}
