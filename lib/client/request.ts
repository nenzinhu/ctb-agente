export type RequestFailureKind = 'timeout' | 'network' | 'http' | 'invalid-response' | 'aborted';

export class RequestError extends Error {
  constructor(public kind: RequestFailureKind, message: string, public status?: number, public data?: unknown) {
    super(message);
    this.name = 'RequestError';
  }
}

/** Bound both transport and JSON parsing; abort the transport on timeout or unmount. */
export async function requestJson<T>(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectCancellation: (reason: RequestError) => void = () => {};
  const cancelled = new Promise<never>((_, reject) => { rejectCancellation = reject; });
  const abort = () => {
    controller.abort();
    rejectCancellation(new RequestError('aborted', 'Consulta cancelada.'));
  };
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) abort();
  timer = setTimeout(() => {
    controller.abort();
    rejectCancellation(new RequestError('timeout', 'O tempo de espera terminou. Tente novamente ou consulte a fonte disponível.'));
  }, timeoutMs);
  try {
    const operation = async () => {
      if (controller.signal.aborted) throw new RequestError('aborted', 'Consulta cancelada.');
      let response: Response;
      try { response = await fetch(input, { ...init, signal: controller.signal }); }
      catch { throw new RequestError('network', 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'); }
      let data: unknown;
      try { data = await response.json(); }
      catch {
        if (!response.ok) throw new RequestError('http', 'O serviço não pôde concluir a solicitação.', response.status);
        throw new RequestError('invalid-response', 'O serviço retornou uma resposta inválida. Tente novamente.');
      }
      if (!response.ok) {
        const payload = data as { message?: string; error?: string } | null;
        throw new RequestError('http', payload?.message || payload?.error || 'O serviço não pôde concluir a solicitação.', response.status, data);
      }
      return data as T;
    };
    return await Promise.race([cancelled, operation()]);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}
