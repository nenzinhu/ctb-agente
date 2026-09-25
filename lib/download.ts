/**
 * Save a Blob as a file through a temporary link.
 * The object URL is released a moment later: revoking it in the same tick
 * can cancel the download in some browsers.
 */
export function baixarArquivo(arquivo: Blob, nome: string): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
