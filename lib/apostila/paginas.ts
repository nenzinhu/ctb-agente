import type { IntervaloPagina, SelecaoPaginasNormalizada } from './tipos';

const MAXIMO_PAGINAS = 2_000;

export class SelecaoPaginasInvalida extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SelecaoPaginasInvalida';
  }
}

function intervalosDe(paginas: number[]): IntervaloPagina[] {
  const intervalos: IntervaloPagina[] = [];
  for (const pagina of paginas) {
    const ultimo = intervalos.at(-1);
    if (ultimo && pagina === ultimo.fim + 1) ultimo.fim = pagina;
    else intervalos.push({ inicio: pagina, fim: pagina });
  }
  return intervalos;
}

function textoIntervalo(intervalo: IntervaloPagina): string {
  return intervalo.inicio === intervalo.fim
    ? String(intervalo.inicio)
    : `${intervalo.inicio}–${intervalo.fim}`;
}

export function parseSelecaoPaginas(valor: string, paginaMaxima?: number): SelecaoPaginasNormalizada {
  if (!valor.trim()) throw new SelecaoPaginasInvalida('Informe ao menos uma página.');
  const tokens = valor.split(',');
  if (tokens.some((token) => !token.trim())) {
    throw new SelecaoPaginasInvalida('Use páginas e intervalos como 3, 10–18.');
  }

  const paginas = new Set<number>();
  for (const tokenBruto of tokens) {
    const token = tokenBruto.trim();
    const correspondencia = token.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (!correspondencia) {
      throw new SelecaoPaginasInvalida('Use páginas e intervalos como 3, 10–18.');
    }
    const inicio = Number(correspondencia[1]);
    const fim = Number(correspondencia[2] ?? correspondencia[1]);
    if (inicio < 1 || fim < 1) throw new SelecaoPaginasInvalida('As páginas devem começar em 1.');
    if (inicio > fim) {
      throw new SelecaoPaginasInvalida('O início do intervalo não pode ser maior que o fim.');
    }
    if (paginaMaxima !== undefined && fim > paginaMaxima) {
      throw new SelecaoPaginasInvalida(`A página ${fim} ultrapassa o limite disponível (${paginaMaxima}).`);
    }
    if (paginas.size + (fim - inicio + 1) > MAXIMO_PAGINAS) {
      throw new SelecaoPaginasInvalida('Selecione no máximo 2.000 páginas por vez.');
    }
    for (let pagina = inicio; pagina <= fim; pagina++) paginas.add(pagina);
    if (paginas.size > MAXIMO_PAGINAS) {
      throw new SelecaoPaginasInvalida('Selecione no máximo 2.000 páginas por vez.');
    }
  }

  const ordenadas = [...paginas].sort((a, b) => a - b);
  const intervalos = intervalosDe(ordenadas);
  return {
    paginas: ordenadas,
    intervalos,
    canonico: intervalos.map(textoIntervalo).join(', '),
  };
}

export function rotuloSelecaoPaginas(selecao: SelecaoPaginasNormalizada): string {
  if (selecao.paginas.length === 1) return `página ${selecao.paginas[0]}`;
  const partes = selecao.intervalos.map(textoIntervalo);
  const ultima = partes.pop();
  return `páginas ${partes.length ? `${partes.join(', ')} e ` : ''}${ultima}`;
}
