// Pure formatting helpers shared by server code and client components.

/**
 * Format a fine value stored in cents
 * @param centavos - Value in cents, as stored in `enquadramentos.valor_multa`
 * @returns Formatted BRL string, e.g. "R$ 293,47"
 */
export function formatarMulta(centavos: number): string {
  const valor = (Number.isFinite(centavos) ? centavos : 0) / 100;
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/**
 * Human label for the recolhedor document field
 * @param documento - Stored document code
 * @returns Label, or null when nothing is collected
 */
export function labelDocumento(
  documento: 'cnh' | 'crlv' | 'ambos' | null | undefined
): string | null {
  if (!documento) return null;
  const labels: Record<'cnh' | 'crlv' | 'ambos', string> = {
    cnh: 'CNH',
    crlv: 'CRLV',
    ambos: 'CNH e CRLV',
  };
  return labels[documento] ?? null;
}

/**
 * Human label for the responsible party
 * @param responsavel - Stored responsible field
 * @returns PT-BR label
 */
export function labelResponsavel(
  responsavel: 'condutor' | 'proprietario' | 'ambos' | undefined
): string {
  const labels: Record<string, string> = {
    condutor: 'Condutor',
    proprietario: 'Proprietário',
    ambos: 'Condutor e proprietário',
  };
  return responsavel ? (labels[responsavel] ?? responsavel) : 'Não informado';
}
