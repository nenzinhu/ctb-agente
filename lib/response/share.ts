// Plain-text rendering of a card, so it can be shared through WhatsApp, e-mail
// or any other app the agent has on the phone.
import type { CartaoEstruturado } from './response-types';
import { formatarMulta, labelDocumento } from './format';

/**
 * Public URL of a card: the consultation page that renders it
 * @param card - Card being shared
 * @param origin - Absolute origin of the app, e.g. `window.location.origin`
 * @returns Absolute URL
 */
export function linkDoCartao(card: CartaoEstruturado, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/consulta?q=${encodeURIComponent(card.consulta)}`;
}

/**
 * Turn a card into a compact plain-text message
 * @param card - Card to render
 * @param link - Optional URL appended at the end
 * @returns Multi-line message, ready to paste
 */
export function formatarCartaoParaTexto(card: CartaoEstruturado, link?: string): string {
  const linhas: string[] = [];
  const { enquadramento } = card;

  if (!card.sucesso || !enquadramento) {
    linhas.push('🚦 CTB Agente — nada encontrado na base');
    linhas.push(`Consulta: ${card.consulta}`);
    if (card.explicacao_simples) linhas.push(card.explicacao_simples);
    if (link) linhas.push('', link);
    return linhas.join('\n');
  }

  linhas.push(`🚦 ${enquadramento.descricao}`);
  linhas.push(`Código MBFT: ${enquadramento.codigo_mbft}`);
  if (enquadramento.desdobramento > 0) {
    linhas.push(`Desdobramento: ${enquadramento.desdobramento}`);
  }
  linhas.push(
    `Gravidade: ${enquadramento.gravidade.toUpperCase()} · ` +
      `${enquadramento.pontos} pontos · ${formatarMulta(enquadramento.valor_multa)}`
  );
  linhas.push(`Amparo legal: ${enquadramento.amparo_legal}`);

  const documento = labelDocumento(enquadramento.recolhe_documento);
  if (documento) linhas.push(`Recolhe documento: ${documento}`);
  if (enquadramento.retem_veiculo) linhas.push('⚠️ Veículo retido');
  if (enquadramento.remove_veiculo) linhas.push('🚗 Remoção do veículo');
  if (card.crime_transito) linhas.push('⚠️ Pode configurar crime de trânsito');

  if (card.explicacao_simples) {
    linhas.push('', card.explicacao_simples);
  }

  if (card.checklist_ait.length > 0) {
    linhas.push('', 'Checklist do AIT:');
    for (const item of card.checklist_ait) linhas.push(`• ${item}`);
  }

  if (link) linhas.push('', link);

  return linhas.join('\n');
}
