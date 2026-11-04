import type { FichaMbft } from '@/lib/mbft/parser';
import type { Pop } from '@/lib/pop/parser';
import { numeroArtigo, type ArtigoConsulta } from '@/lib/ctb/artigos';
export interface PacoteOffline { schema: 1; versao: string; artigos: ArtigoConsulta[]; fichas: FichaMbft[]; pops: Pop[] }
export interface PacoteSalvo { pacote: PacoteOffline; baixadoEm: string }
const strings = (x: unknown) => Array.isArray(x) && x.every(v => typeof v === 'string');
export function pacoteValido(x: unknown): x is PacoteOffline {
  if (!x || typeof x !== 'object') return false;
  const p = x as PacoteOffline;
  return p.schema === 1 && typeof p.versao === 'string' && p.versao.length > 0 && Array.isArray(p.artigos) && p.artigos.length > 0 && p.artigos.length < 1000 && p.artigos.every(a => a && typeof a.texto === 'string' && typeof a.numero === 'string' && !!numeroArtigo(a.numero) && typeof a.fonte === 'string' && typeof a.versao === 'string' && typeof a.aviso === 'string')
    && Array.isArray(p.fichas) && p.fichas.length < 5000 && p.fichas.every(f => f && Number.isFinite(f.pagina) && typeof f.codigo === 'string' && typeof f.tipificacaoResumida === 'string' && ['amparoLegal','tipificacao','gravidade','penalidade','medidaAdministrativa','configuraCrime','infrator','competencia','pontuacao','constatacao'].every(k => typeof (f as unknown as Record<string, unknown>)[k] === 'string') && ['quandoAutuar','quandoNaoAutuar','definicoes','exemplos','informacoesComplementares'].every(k => strings((f as unknown as Record<string, unknown>)[k])))
    && Array.isArray(p.pops) && p.pops.length < 5000 && p.pops.every(p => p && Number.isFinite(p.pagina) && typeof p.numero === 'string' && typeof p.titulo === 'string' && Array.isArray(p.fundamentacao) && p.fundamentacao.every(f => f && typeof f.norma === 'string' && typeof f.especificacao === 'string') && ['estabelecido','atualizado','execucao'].every(k => typeof (p as unknown as Record<string,unknown>)[k] === 'string') && ['sequencia','material','atividadesCriticas','errosEvitar','anexos'].every(k => { const a = (p as unknown as Record<string,unknown>)[k]; return Array.isArray(a) && a.every(i => i && typeof i.texto === 'string'); }));
}
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const refArtigo = (s: string) => numeroArtigo(s.match(/(?:art(?:igo)?\.?\s*)?(\d{1,3}(?:-[a-z])?)/i)?.[0] ?? '');
export function buscarOffline(p: PacoteOffline, query: string) {
  const q = normalizar(query);
  if (!q) return { artigos: [], fichas: [], pops: [] };
  const artigo = /^art(?:igo)?\.?\s*\d/i.test(q) ? refArtigo(q) : null;
  const codigo = /^\d{3}[- ]?\d{2}$/.test(q) ? q.replace(/\D/g, '') : null;
  const numeroPop = q.match(/^pop\s*(\d+(?:\.\d+)*)$/i)?.[1];
  const termos = q.split(/\s+/).filter(Boolean);
  const contem = (s: string) => termos.every(t => normalizar(s).includes(t));
  return {
    artigos: p.artigos.filter(a => artigo ? a.numero === artigo : !codigo && !numeroPop && contem(a.texto)),
    fichas: p.fichas.filter(f => codigo ? f.codigo.replace(/\D/g, '') === codigo : artigo ? refArtigo(f.amparoLegal) === artigo : !numeroPop && contem(`${f.codigo} ${f.tipificacaoResumida} ${f.amparoLegal}`)),
    pops: p.pops.filter(p => numeroPop ? p.numero.replace(/^0+(?=\d)/, '') === numeroPop.replace(/^0+(?=\d)/, '') : !artigo && !codigo && contem(`${p.numero} ${p.titulo} ${p.sequencia.map(i => i.texto).join(' ')}`)),
  };
}
