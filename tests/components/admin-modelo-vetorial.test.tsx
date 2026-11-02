import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminModeloVetorial from '@/components/admin/AdminModeloVetorial';
import { EMBEDDING_MODELS, NEMOTRON_EMBED_MODEL } from '@/lib/ai/embedding-models';

describe('seleção do modelo vetorial', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('mostra a opção principal e salva uma alternativa sem gerar vetores automaticamente', async () => {
    const mockFetch = jest.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () =>
      options?.method === 'PUT' ? { modelo: 'mistral-embed' } : {
        modelo: NEMOTRON_EMBED_MODEL, configurado: true, esquemaPronto: true,
        modelos: EMBEDDING_MODELS.map((m) => ({ ...m, configurado: true })),
      },
    }));
    global.fetch = mockFetch as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<AdminModeloVetorial />);
    expect(await screen.findByRole('radio', { name: /NVIDIA: Nemotron 3.5 Embed 8B/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Mistral Embed/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar modelo vetorial' }));
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/embeddings', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ modelo: 'mistral-embed' }),
    }));
    expect(mockFetch.mock.calls.some(([url]) => url.includes('/vetores'))).toBe(false);
  });
});
