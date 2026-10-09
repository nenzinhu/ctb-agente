import { render, screen } from '@testing-library/react';
import AdminRagFineTuning from '@/components/admin/AdminRagFineTuning';

describe('AdminRagFineTuning', () => {
  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('explica RAG e ajuste fino separadamente e mostra o diagnóstico atual', async () => {
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => url === '/api/admin/providers'
        ? ({ providers: [{
            id: 'groq', nome: 'Groq', configurado: true,
            saude: { status: 'funcionando', modeloTestado: 'llama', latenciaMs: 42, ultimoTesteEm: '2026-10-08T10:00:00.000Z' },
          }] })
        : ({
            banco: 'ok', bancoEscrita: 'ok', embeddings: 'indisponivel', esquemaRag: 9,
            avisos: ['Aplique a migração 010.', 'Defina MISTRAL_API_KEY.'],
          }),
    })) as unknown as typeof fetch;

    render(<AdminRagFineTuning />);

    expect(screen.getByRole('heading', { name: /RAG: busca com fontes oficiais/i })).toBeInTheDocument();
    expect(screen.getByText(/geração aumentada por recuperação/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum modelo foi treinado/i)).toBeInTheDocument();
    expect(screen.getByText(/não substitui/i)).toBeInTheDocument();

    expect(await screen.findByText(/Busca textual no banco/i)).toBeInTheDocument();
    expect(screen.getByText(/Esquema RAG 9/i)).toBeInTheDocument();
    expect(screen.getByText(/Aplique a migração 010/i)).toBeInTheDocument();
    expect(screen.getByText(/Defina MISTRAL_API_KEY/i)).toBeInTheDocument();
    expect(await screen.findByText(/Groq · funcionando/i)).toBeInTheDocument();
    expect(screen.getByText(/llama · 42 ms/i)).toBeInTheDocument();
  });
});
