import { compartilharTexto } from '@/lib/share/send';

/** navigator is a jsdom object with only a few writable properties. */
const nav = navigator as unknown as Record<string, unknown>;

function definir(nome: 'share' | 'clipboard', valor: unknown): void {
  Object.defineProperty(navigator, nome, { value: valor, configurable: true });
}

describe('compartilharTexto', () => {
  afterEach(() => {
    delete nav.share;
    delete nav.clipboard;
  });

  it('uses the native share sheet when the device has one', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    definir('share', share);
    const writeText = jest.fn();
    definir('clipboard', { writeText });

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('compartilhado');

    expect(share).toHaveBeenCalledWith({ title: 'CTB Agente', text: 'cartão' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('treats a dismissed sheet as a cancellation, not a failure', async () => {
    definir('share', jest.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')));

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('cancelado');
  });

  it('reports a real share failure', async () => {
    definir('share', jest.fn().mockRejectedValue(new Error('boom')));

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('falhou');
  });

  it('falls back to the clipboard when there is no share sheet', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    definir('share', undefined);
    definir('clipboard', { writeText });

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('copiado');

    expect(writeText).toHaveBeenCalledWith('cartão');
  });

  it('reports a clipboard failure', async () => {
    definir('share', undefined);
    definir('clipboard', { writeText: jest.fn().mockRejectedValue(new Error('denied')) });

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('falhou');
  });

  it('says it is unavailable when the browser offers neither', async () => {
    definir('share', undefined);
    definir('clipboard', undefined);

    await expect(compartilharTexto('cartão', 'CTB Agente')).resolves.toBe('indisponivel');
  });
});
