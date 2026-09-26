// Pending bills (projetos de lei) related to a theme, from the Câmara open data API.
// Always best-effort: the dossiê must generate even when the API is unreachable.
import type { PDFTheme } from './themes';

const API_BASE = 'https://dadosabertos.camara.leg.br/api/v2/proposicoes';
const TIMEOUT_MS = 5000;

export interface ProjetoDeLei {
  numero: string;
  ano: number;
  ementa: string;
  situacao: string;
  link: string;
}

interface ProposicaoApi {
  id: number;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
}

/**
 * Fetch pending bills whose ementa matches the theme keywords
 * @param theme - Theme being generated
 * @param limit - Maximum number of bills to return
 * @returns Bills, empty when the API fails or nothing matches
 */
export async function getProjetosDeLei(
  theme: PDFTheme,
  limit = 5
): Promise<ProjetoDeLei[]> {
  return buscarProjetosDeLei(theme.keywords, limit);
}

/**
 * Pending bills whose ementa mentions any of the keywords
 * @param palavras - Keywords (any match counts)
 * @param limit - Maximum number of bills to return
 * @returns Bills, empty when the API fails or nothing matches
 */
export async function buscarProjetosDeLei(palavras: string[], limit = 5): Promise<ProjetoDeLei[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const ano = new Date().getFullYear();
    const url = `${API_BASE}?siglaTipo=PL&ano=${ano}&itens=100&ordem=DESC&ordenarPor=id`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as { dados?: ProposicaoApi[] };
    const propostas = data.dados ?? [];
    const chaves = palavras.map((k) => k.toLowerCase()).filter(Boolean);

    return propostas
      .filter((p) => {
        const ementa = (p.ementa ?? '').toLowerCase();
        return chaves.some((k) => ementa.includes(k));
      })
      .slice(0, limit)
      .map((p) => ({
        numero: `${p.siglaTipo ?? 'PL'} ${p.numero ?? p.id}/${p.ano ?? ano}`,
        ano: p.ano ?? ano,
        ementa: p.ementa ?? '',
        situacao: 'Em tramitação (consultar o link oficial)',
        link: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
      }));
  } catch (error) {
    console.warn('Não foi possível carregar projetos de lei:', error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
