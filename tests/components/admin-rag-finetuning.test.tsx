import { render, screen } from '@testing-library/react';
import AdminRagFineTuning from '@/components/admin/AdminRagFineTuning';

describe('AdminRagFineTuning', () => {
  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('explains RAG and fine-tuning separately and shows the live diagnosis', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        banco: 'ok',
        bancoEscrita: 'ok',
        embeddings: 'indisponivel',
        esquemaRag: 9,
        avisos: ['Aplique a migration 010.', 'Defina MISTRAL_API_KEY.'],
      }),
    })) as unknown as typeof fetch;

    render(<AdminRagFineTuning />);

    expect(screen.getByRole('heading', { name: /RAG: busca com fontes oficiais/i })).toBeInTheDocument();
    expect(screen.getByText(/geração aumentada por recuperação/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum modelo foi treinado/i)).toBeInTheDocument();
    expect(screen.getByText(/não substitui/i)).toBeInTheDocument();

    expect(await screen.findByText(/Busca textual no banco/i)).toBeInTheDocument();
    expect(screen.getByText(/Esquema RAG 9/i)).toBeInTheDocument();
    expect(screen.getByText(/Aplique a migration 010/i)).toBeInTheDocument();
    expect(screen.getByText(/Defina MISTRAL_API_KEY/i)).toBeInTheDocument();
  });
});
