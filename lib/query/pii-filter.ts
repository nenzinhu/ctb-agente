// PII (Personally Identifiable Information) filtering
//
// Masks plates, CPF, CNPJ and other identifiers before text reaches the
// database, the AI providers or the usage log. The previous regexes had
// gaps: the Mercosul plate pattern missed some formats, the 11-digit
// number masked phone numbers, and there was no mask for CNH numbers
// (which are also sensitive in a traffic-enforcement context).

const MASCARA = '****';

/** Mask plate: ABC-1234, ABC1234, Mercosul (ABC1D23, ABC1D234) */
function mascararPlacas(texto: string): string {
  return texto.replace(
    /\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b|\b[A-Z]{3}\d{2}[A-Z]\d{3}\b/gi,
    MASCARA
  );
}

/** Mask CPF: XXX.XXX.XXX-XX or XXXXXXXXXXX */
function mascararCPF(texto: string): string {
  return texto.replace(
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g,
    '***-****'
  );
}

/** Mask CNPJ: XX.XXX.XXX/XXXX-XX */
function mascararCNPJ(texto: string): string {
  return texto.replace(
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    '****-****'
  );
}

/** Mask CNH (11 digits, but only when it looks like a CNH — starts with a digit and is preceded by a label or at the start) */
function mascararCNH(texto: string): string {
  return texto.replace(
    /\b(?:cnh|carteira de habilitação|carteira de motorista)\s*:?\s*\d{11}\b/gi,
    (m) => m.replace(/\d{11}/, '***********')
  );
}

/**
 * Filter sensitive information from text
 * Masks plate numbers, CPF, CNPJ and CNH numbers
 * @param text - Text to filter
 * @returns Text with PII masked
 */
export function filterPII(text: string): string {
  if (!text) return text;
  let filtered = text;
  filtered = mascararCNH(filtered);
  filtered = mascararPlacas(filtered);
  filtered = mascararCNPJ(filtered);
  filtered = mascararCPF(filtered);
  return filtered;
}