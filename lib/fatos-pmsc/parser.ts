export interface FragmentoPdf {
  x: number;
  y: number;
  texto: string;
  largura?: number;
}

export interface PaginaFatosPdf {
  numero: number;
  fragmentos: FragmentoPdf[];
}

export interface FatoPmsc {
  grupo: string;
  natureza: string;
  potencialOfensivo: string;
  pagina: number;
  versao: '10/06/2019';
}

export function textoRagFatos(fatos: FatoPmsc[]): string {
  return fatos.map((fato) => [
    `--- Página ${fato.pagina} ---`,
    `## ${fato.natureza}`,
    `Grupo: ${fato.grupo}`,
    `Natureza: ${fato.natureza}`,
    `Potencial ofensivo: ${fato.potencialOfensivo}`,
    '',
  ].join('\n')).join('');
}

interface Ancora {
  y: number;
  potencial: FragmentoPdf[];
}

const normalizarEspacos = (texto: string) => texto.replace(/\s+/g, ' ').trim();

function juntar(fragmentos: FragmentoPdf[]): string {
  const linhas = new Map<number, FragmentoPdf[]>();
  for (const fragmento of fragmentos) {
    const y = Math.round(fragmento.y);
    linhas.set(y, [...(linhas.get(y) ?? []), fragmento]);
  }
  return [...linhas.entries()].sort((a, b) => b[0] - a[0]).map(([, itens]) => {
    const ordenados = itens.sort((a, b) => a.x - b.x);
    let texto = '';
    let fimAnterior: number | null = null;
    for (const item of ordenados) {
      const colado = fimAnterior !== null && item.largura !== undefined && item.x <= fimAnterior + 1.5;
      texto += `${texto && !colado ? ' ' : ''}${item.texto}`;
      fimAnterior = item.largura === undefined ? null : item.x + item.largura;
    }
    return texto;
  }).join(' ');
}

function ancorasDaPagina(fragmentos: FragmentoPdf[]): Ancora[] {
  const porLinha = new Map<number, FragmentoPdf[]>();
  for (const item of fragmentos.filter((parte) => parte.x >= 500)) {
    const y = Math.round(item.y);
    porLinha.set(y, [...(porLinha.get(y) ?? []), item]);
  }
  const potenciais = [...porLinha.entries()].map(([y, itens]) => ({
    x: Math.min(...itens.map((item) => item.x)),
    y,
    texto: juntar(itens),
  }))
    .filter((item) => /^(?:atípico|maior|menor|condicionado)$/i.test(item.texto.trim()))
    .sort((a, b) => b.y - a.y);
  const ancoras: Ancora[] = [];
  for (const item of potenciais) {
    const atual = ancoras[ancoras.length - 1];
    if (atual && Math.abs(atual.y - item.y) <= 14) {
      atual.potencial.push(item);
      atual.y = atual.potencial.reduce((soma, parte) => soma + parte.y, 0) / atual.potencial.length;
    } else {
      ancoras.push({ y: item.y, potencial: [item] });
    }
  }
  return ancoras;
}

export function lerFatosPmsc(paginas: PaginaFatosPdf[]): FatoPmsc[] {
  const fatos: FatoPmsc[] = [];
  for (const pagina of paginas) {
    const ancoras = ancorasDaPagina(pagina.fragmentos);
    for (const ancora of ancoras) {
      const proximos = pagina.fragmentos.filter((item) => {
        if (item.x >= 500 || item.y < 55 || item.y > 725) return false;
        const maisProxima = ancoras.reduce((melhor, candidata) =>
          Math.abs(candidata.y - item.y) < Math.abs(melhor.y - item.y) ? candidata : melhor
        );
        return maisProxima === ancora && Math.abs(item.y - ancora.y) <= 18;
      });
      const grupo = normalizarEspacos(juntar(proximos.filter((item) => item.x < 120)));
      const natureza = normalizarEspacos(juntar(proximos.filter((item) => item.x >= 120)));
      const potencialOfensivo = normalizarEspacos(juntar(ancora.potencial));
      if (grupo && natureza && potencialOfensivo) {
        fatos.push({ grupo, natureza, potencialOfensivo, pagina: pagina.numero, versao: '10/06/2019' });
      }
    }
  }
  return fatos;
}
