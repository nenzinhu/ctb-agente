import type { ParteApostila, TrechoApostila } from './tipos';

export const MAX_CARACTERES_APOSTILA = 36_000;
export const MAX_CARACTERES_PARTE = 6_000;
export const MAX_PARTES_APOSTILA = 6;

export class ConteudoApostilaExcessivo extends Error {
  constructor() {
    super('O conteúdo selecionado é muito extenso. Escolha uma faixa menor, com até 36.000 caracteres.');
    this.name = 'ConteudoApostilaExcessivo';
  }
}

type Fragmento = {
  texto: string;
  pagina: number | null;
  secao: string | null;
};

function dividirTexto(texto: string): string[] {
  const partes: string[] = [];
  let restante = texto.trim();
  while (restante.length > MAX_CARACTERES_PARTE) {
    const janela = restante.slice(0, MAX_CARACTERES_PARTE + 1);
    const quebraLinha = janela.lastIndexOf('\n');
    const espaco = janela.lastIndexOf(' ');
    const candidato = Math.max(quebraLinha, espaco);
    const corte = candidato >= Math.floor(MAX_CARACTERES_PARTE / 2)
      ? candidato
      : MAX_CARACTERES_PARTE;
    partes.push(restante.slice(0, corte).trim());
    restante = restante.slice(corte).trim();
  }
  if (restante) partes.push(restante);
  return partes;
}

export function prepararPartesApostila(trechos: TrechoApostila[]): ParteApostila[] {
  const ordenados = [...trechos]
    .sort((a, b) => (a.pagina ?? Number.MAX_SAFE_INTEGER) - (b.pagina ?? Number.MAX_SAFE_INTEGER) || a.ordem - b.ordem)
    .filter((trecho) => trecho.texto.trim());
  const total = ordenados.reduce((soma, trecho) => soma + trecho.texto.trim().length, 0);
  if (total > MAX_CARACTERES_APOSTILA) throw new ConteudoApostilaExcessivo();

  const fragmentos: Fragmento[] = ordenados.flatMap((trecho) =>
    dividirTexto(trecho.texto).map((texto) => ({ texto, pagina: trecho.pagina, secao: trecho.secao }))
  );
  const partes: ParteApostila[] = [];
  let textos: string[] = [];
  let paginas = new Set<number>();
  let secoes = new Set<string>();

  const concluir = () => {
    if (textos.length === 0) return;
    partes.push({
      indice: partes.length,
      texto: textos.join('\n\n'),
      paginas: [...paginas].sort((a, b) => a - b),
      secoes: [...secoes],
    });
    textos = [];
    paginas = new Set<number>();
    secoes = new Set<string>();
  };

  for (const fragmento of fragmentos) {
    const tamanho = textos.length === 0
      ? fragmento.texto.length
      : textos.join('\n\n').length + 2 + fragmento.texto.length;
    if (tamanho > MAX_CARACTERES_PARTE) concluir();
    textos.push(fragmento.texto);
    if (fragmento.pagina !== null) paginas.add(fragmento.pagina);
    if (fragmento.secao) secoes.add(fragmento.secao);
  }
  concluir();
  if (partes.length > MAX_PARTES_APOSTILA) throw new ConteudoApostilaExcessivo();
  return partes;
}
