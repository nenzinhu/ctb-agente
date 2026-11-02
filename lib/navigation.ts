import type { NomeIcone } from '@/components/ui/Icone';

export interface Destino {
  href: string;
  label: string;
  descricao: string;
  icone: NomeIcone;
}

export const NAVEGACAO_PRINCIPAL: Destino[] = [
  { href: '/', label: 'Consultar CTB', descricao: 'Infrações e artigos', icone: 'busca' },
  { href: '/pop', label: 'Consultar POPs', descricao: 'Procedimentos operacionais', icone: 'escudo' },
  { href: '/favoritos', label: 'Favoritos', descricao: 'Enquadramentos salvos neste aparelho', icone: 'estrela' },
];

export const GRUPOS_FERRAMENTAS: { titulo: string; itens: Destino[] }[] = [
  {
    titulo: 'Fiscalização',
    itens: [
      { href: '/fatos-pmsc', label: 'Lista de Fatos PMSC', descricao: 'Naturezas e potencial ofensivo', icone: 'arquivo' },
      { href: '/pesos-dimensoes', label: 'Pesos e dimensões', descricao: 'Limites e excesso de peso', icone: 'balanca' },
      { href: '/estrangeiros', label: 'Condutores e veículos estrangeiros', descricao: 'Documentos, acordos e enquadramentos', icone: 'globo' },
      { href: '/casos', label: 'Casos práticos', descricao: 'Situações de fiscalização e procedimentos', icone: 'check' },
    ],
  },
  {
    titulo: 'Estudo',
    itens: [
      { href: '/professor', label: 'Explicar situações', descricao: 'Professor Emérito: explicações e comparações', icone: 'professor' },
      { href: '/apostila', label: 'Gerar apostila', descricao: 'Material de estudo a partir do acervo', icone: 'livro' },
    ],
  },
  {
    titulo: 'Documentos',
    itens: [
      { href: '/gerador-pdf', label: 'Gerar PDF', descricao: 'Criar documentos para consulta e impressão', icone: 'arquivo' },
      { href: '/comprimir-pdf', label: 'Comprimir PDF', descricao: 'Reduzir arquivos no aparelho', icone: 'comprimir' },
    ],
  },
];

export function destinoAtivo(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/consulta' || pathname.startsWith('/consulta/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ferramentaAtiva(pathname: string): boolean {
  return GRUPOS_FERRAMENTAS.some(({ itens }) => itens.some(({ href }) => destinoAtivo(href, pathname)));
}
