// Turns the model's plain-text answer into blocks React can render safely
// (no HTML injection, no markdown library): paragraphs, bullet and numbered
// lists, **bold** and [n] citations.

export type Trecho = { tipo: 'texto'; valor: string } | { tipo: 'negrito'; valor: string } | { tipo: 'citacao'; n: number };

export type Bloco =
  | { tipo: 'paragrafo'; conteudo: Trecho[] }
  | { tipo: 'lista'; itens: Trecho[][] }
  | { tipo: 'numerada'; itens: Trecho[][] };

const ITEM_LISTA = /^\s*[-•*]\s+(.*)$/;
const ITEM_NUMERADO = /^\s*\d{1,2}[.)]\s+(.*)$/;

/**
 * Splits inline text into plain, bold and citation pieces.
 */
export function trechosInline(linha: string): Trecho[] {
  const partes: Trecho[] = [];
  const padrao = /\*\*([^*]+)\*\*|\[(\d{1,2})\]/g;
  let inicio = 0;
  for (let m = padrao.exec(linha); m; m = padrao.exec(linha)) {
    if (m.index > inicio) partes.push({ tipo: 'texto', valor: linha.slice(inicio, m.index) });
    partes.push(m[1] !== undefined ? { tipo: 'negrito', valor: m[1] } : { tipo: 'citacao', n: Number(m[2]) });
    inicio = padrao.lastIndex;
  }
  if (inicio < linha.length) partes.push({ tipo: 'texto', valor: linha.slice(inicio) });
  return partes;
}

/**
 * @param resposta - Answer text as returned by the model
 * @returns Blocks in reading order
 */
export function formatarResposta(resposta: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) blocos.push({ tipo: 'paragrafo', conteudo: trechosInline(paragrafo.join(' ')) });
    paragrafo = [];
  };

  for (const linha of resposta.replace(/\r\n?/g, '\n').split('\n')) {
    const lista = ITEM_LISTA.exec(linha);
    const numerada = ITEM_NUMERADO.exec(linha);
    const tipo = lista ? 'lista' : numerada ? 'numerada' : null;

    if (tipo) {
      fecharParagrafo();
      const item = trechosInline((lista ?? numerada)![1].trim());
      const ultimo = blocos[blocos.length - 1];
      if (ultimo && ultimo.tipo === tipo) ultimo.itens.push(item);
      else blocos.push({ tipo, itens: [item] });
    } else if (linha.trim()) {
      paragrafo.push(linha.trim());
    } else {
      fecharParagrafo();
    }
  }
  fecharParagrafo();
  return blocos;
}
