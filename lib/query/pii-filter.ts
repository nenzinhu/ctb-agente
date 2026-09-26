// PII (Personally Identifiable Information) filtering
/**
 * Filter sensitive information from text
 * Masks plate numbers, CPF, and CNPJ
 * @param text - Text to filter
 * @returns Text with PII masked
 */
export function filterPII(text: string): string {
  let filtered = text;

  // Mask plate: old pattern (ABC-1234, ABC1234) and Mercosul (ABC1D23)
  filtered = filtered.replace(/\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/gi, '****');

  // Mask CPF (XXX.XXX.XXX-XX or XXXXXXXXXXX)
  filtered = filtered.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}/g, '***-****');

  // Mask CNPJ (XX.XXX.XXX/XXXX-XX)
  filtered = filtered.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '****-****');

  // Mask proper names (optional, keep for now)
  // This is more complex; skip for MVP

  return filtered;
}
