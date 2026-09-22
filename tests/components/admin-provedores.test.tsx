import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminProvedores from '@/components/admin/AdminProvedores';

const PROVIDERS = [
  {
    id: 'groq',
    nome: 'Groq',
    envVar: 'GROQ_API_KEY',
    modeloPadrao: 'llama-3.3-70b-versatile',
    modelos: ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b'],
    papel: 'resposta rapida',
    cadastro: 'https://console.groq.com/keys',
    ordem: 1,
    configurado: true,
  },
  {
    id: 'gemini',
    nome: 'Google Gemini (AI Studio)',
    envVar: 'GEMINI_API_KEY',
    modeloPadrao: 'gemini-2.5-flash',
    modelos: ['gemini-2.5-flash'],
    papel: 'resposta analitica',
    cadastro: 'https://aistudio.google.com/apikey',
    ordem: 2,
    configurado: false,
  },
];

function mockFetch() {
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url === '/api/admin/providers') {
      return { ok: true, json: async () => ({ providers: PROVIDERS, preferencia: null }) };
    }
    if (method === 'POST') {
      const { modelo } = JSON.parse(init!.body as string);
      const ok = modelo !== 'openai/gpt-oss-20b';
      return {
        ok,
        json: async () => ({
          provider: 'Groq',
          ok,
          modeloUsado: modelo,
          latenciaMs: 42,
          resposta: ok ? 'ok' : undefined,
          erro: ok ? undefined : 'Groq HTTP 404 (modelo não encontrado)',
        }),
      };
    }
    if (method === 'PUT') {
      return { ok: true, json: async () => ({ preferencia: JSON.parse(init!.body as string) }) };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('AdminProvedores', () => {
  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('tests every model of the configured providers and reports which work', async () => {
    const fetchMock = mockFetch();
    render(<AdminProvedores />);
    await screen.findByText('Groq');

    await userEvent.click(screen.getByRole('button', { name: /testar todos/i }));

    expect(await screen.findByText(/1 de 2 modelos responderam/)).toBeInTheDocument();
    const pings = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    // Gemini has no key, so only Groq's two models are pinged.
    expect(pings.map(([, init]) => JSON.parse(init!.body as string).modelo).sort()).toEqual([
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-20b',
    ]);
    expect(screen.getByText(/modelo não encontrado/)).toBeInTheDocument();
  });

  it('saves the chosen model as the one in use', async () => {
    const fetchMock = mockFetch();
    render(<AdminProvedores />);
    await screen.findByText('Groq');

    await userEvent.selectOptions(screen.getByLabelText('Modelo de Groq'), 'openai/gpt-oss-20b');
    await userEvent.click(screen.getAllByRole('button', { name: 'Usar este' })[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/providers',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ providerId: 'groq', modelo: 'openai/gpt-oss-20b' }),
        })
      )
    );
    expect(await screen.findByRole('button', { name: 'Em uso' })).toBeDisabled();
  });

  it('does not let a provider without a key be chosen', async () => {
    mockFetch();
    render(<AdminProvedores />);
    await screen.findByText('Google Gemini (AI Studio)');

    expect(screen.getAllByRole('button', { name: 'Usar este' })[1]).toBeDisabled();
    expect(screen.getAllByText('criar chave grátis')[1]).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey'
    );
  });
});
