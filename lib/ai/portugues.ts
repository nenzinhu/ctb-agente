// Language policy shared by every text-generation provider. Search embeddings
// are unaffected: this applies only to content shown to the user.
export const SISTEMA_PORTUGUES_BR = [
  'Responda sempre e exclusivamente em português do Brasil (pt-BR).',
  'Mesmo que a pergunta, o modelo ou algum trecho esteja em outro idioma, não responda em inglês.',
  'Preserve literalmente códigos de infração, artigos, siglas, citações, nomes próprios e chaves JSON solicitadas.',
  'Não traduza nem altere identificadores oficiais.',
].join(' ');

const MARCADORES_INGLES = new Set([
  'the', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'must', 'should',
  'driver', 'vehicle', 'traffic', 'offense', 'infraction', 'law', 'when', 'where', 'which',
  'with', 'without', 'from', 'under', 'according', 'stop', 'show', 'document', 'documents',
  'answer', 'step', 'steps', 'use', 'using', 'before', 'after', 'during', 'because', 'only',
]);

const MARCADORES_PORTUGUES = new Set([
  'não', 'uma', 'para', 'como', 'quando', 'onde', 'qual', 'deve', 'pode', 'condutor', 'veículo',
  'trânsito', 'infração', 'lei', 'artigo', 'multa', 'pontos', 'penalidade', 'medida', 'autuar',
  'documento', 'documentos', 'resposta', 'passo', 'antes', 'depois', 'durante', 'porque',
  'somente', 'apresentar', 'parar', 'procedimento', 'abordagem',
]);

const palavras = (texto: string) => texto.toLocaleLowerCase('pt-BR').match(/[a-zà-ú]+/g) ?? [];

/** Detects a predominantly English answer without rejecting codes or short labels. */
export function pareceRespostaEmIngles(texto: string): boolean {
  const tokens = palavras(texto);
  if (tokens.length < 3) return false;
  const ingles = tokens.filter((token) => MARCADORES_INGLES.has(token)).length;
  const portugues = tokens.filter((token) => MARCADORES_PORTUGUES.has(token)).length;
  return ingles >= 3 && ingles / tokens.length >= 0.35 && ingles > portugues * 1.5;
}

/** One corrective pass used only when a provider ignored the pt-BR system rule. */
export function promptReescreverEmPortugues(resposta: string): string {
  return [
    'Reescreva a resposta abaixo exclusivamente em português do Brasil.',
    'Não acrescente nem remova fatos. Preserve códigos, artigos, siglas, citações, Markdown e a estrutura JSON.',
    'Entregue somente a resposta corrigida, sem comentários sobre a tradução.',
    '',
    '<RESPOSTA_A_CORRIGIR>',
    resposta,
    '</RESPOSTA_A_CORRIGIR>',
  ].join('\n');
}
