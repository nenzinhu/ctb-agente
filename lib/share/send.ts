// How the text reaches the operating system. Browser-only, but React-free:
// the component only maps the returned outcome to a message.

/**
 * What happened when we tried to hand the text to the device.
 * `cancelado` is not a failure: the user simply closed the native sheet.
 */
export type ResultadoCompartilhamento =
  | 'compartilhado'
  | 'copiado'
  | 'cancelado'
  | 'indisponivel'
  | 'falhou';

/**
 * Share a text through the device: native share sheet when it exists,
 * clipboard otherwise. Never throws.
 * @param texto - Text to deliver
 * @param titulo - Title shown by the native sheet
 * @returns What happened
 */
export async function compartilharTexto(
  texto: string,
  titulo: string
): Promise<ResultadoCompartilhamento> {
  if (typeof navigator === 'undefined') return 'indisponivel';

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: titulo, text: texto });
      return 'compartilhado';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelado';
      return 'falhou';
    }
  }

  if (typeof navigator.clipboard?.writeText !== 'function') return 'indisponivel';

  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch {
    return 'falhou';
  }
}
