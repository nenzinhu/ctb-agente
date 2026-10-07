// Language policy shared by every text-generation provider. Search embeddings
// are unaffected: this applies only to content shown to the user.
export const SISTEMA_PORTUGUES_BR = [
  'Responda sempre e exclusivamente em português do Brasil (pt-BR).',
  'Mesmo que a pergunta, o modelo ou algum trecho esteja em outro idioma, não escreva frases, títulos ou explicações em inglês.',
  'Não misture idiomas: traduza para pt-BR todos os termos comuns e mantenha outro idioma somente em nomes próprios e identificadores oficiais.',
  'Preserve literalmente códigos de infração, artigos, siglas, citações, nomes próprios e chaves JSON solicitadas.',
  'Não traduza nem altere identificadores oficiais.',
].join(' ');

const MARCADORES_INGLES = new Set([
  'the', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'must', 'should',
  'driver', 'vehicle', 'traffic', 'offense', 'infraction', 'law', 'when', 'where', 'which',
  'with', 'without', 'from', 'under', 'according', 'stop', 'show', 'document', 'documents',
  'answer', 'step', 'steps', 'using', 'before', 'after', 'during', 'because', 'only',
  'however', 'therefore', 'summary', 'required', 'prohibited', 'allowed', 'procedure',
  'conduct', 'person', 'police', 'road', 'license', 'fine', 'points', 'penalty',
  'administrative', 'measure', 'article', 'code', 'section', 'page', 'source',
  'question', 'response', 'first', 'then', 'finally', 'always', 'never', 'follow',
  'ensure', 'safety', 'necessary', 'information', 'provided', 'proceeding',
]);

const palavras = (texto: string) => texto.toLocaleLowerCase('pt-BR').match(/[a-zà-ú]+/g) ?? [];

/** Detects English fragments, including answers that mix English and Portuguese. */
export function pareceRespostaEmIngles(texto: string): boolean {
  const tokens = palavras(texto);
  if (tokens.length < 3) return false;
  const ingles = tokens.filter((token) => MARCADORES_INGLES.has(token)).length;
  const tituloEmIngles = /(?:^|\n)\s*(?:summary|answer|procedure|steps?|source|question|response)\s*:/im.test(texto);
  return tituloEmIngles || ingles >= 3 || (ingles >= 2 && ingles / tokens.length >= 0.12);
}

/** One corrective pass used only when a provider ignored the pt-BR system rule. */
export function promptReescreverEmPortugues(resposta: string): string {
  return [
    'Reescreva a resposta abaixo exclusivamente em português do Brasil.',
    'Traduza também títulos, listas e trechos que estejam misturados em inglês e português.',
    'Não acrescente nem remova fatos. Preserve códigos, artigos, siglas, citações, Markdown e a estrutura JSON.',
    'Entregue somente a resposta corrigida, sem comentários sobre a tradução.',
    '',
    '<RESPOSTA_A_CORRIGIR>',
    resposta,
    '</RESPOSTA_A_CORRIGIR>',
  ].join('\n');
}
