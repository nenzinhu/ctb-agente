import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        : url === '/api/admin/intencoes'
          ? ({ exemplos: [] })
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

  it('permite revisar a intenção e registrar os IDs oficiais esperados', async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => url === '/api/admin/intencoes' && init?.method !== 'PATCH'
        ? ({ exemplos: [{
            id: 'e1', consulta_anonimizada: 'mexendo no zap no volante',
            dominio_previsto: 'infracao', confianca: 0.88, revisada: false,
            resultados: [{ tipo: 'ficha_mbft', id: '763-31' }],
          }] })
        : url === '/api/admin/providers'
          ? ({ providers: [] })
          : url === '/api/admin/intencoes'
            ? ({ exemplo: { id: 'e1', revisada: true } })
            : ({ banco: 'ok', bancoEscrita: 'ok', embeddings: 'ok', esquemaRag: 10, avisos: [] }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<AdminRagFineTuning />);
    expect(await screen.findByText('mexendo no zap no volante')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/domínio esperado/i), 'infracao');
    await user.clear(screen.getByLabelText(/IDs oficiais esperados/i));
    await user.type(screen.getByLabelText(/IDs oficiais esperados/i), '763-32');
    await user.click(screen.getByRole('button', { name: /salvar correção/i }));

    expect(await screen.findByText(/correção salva/i)).toBeInTheDocument();
    const chamada = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({
      id: 'e1', dominioEsperado: 'infracao',
      resultadosEsperados: [{ tipo: 'ficha_mbft', id: '763-32' }],
    });
  });

  it('reabre e preserva uma revisão com tipos de fonte diferentes', async () => {
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => url === '/api/admin/intencoes'
        ? ({ exemplos: [{
            id: 'e2', consulta_anonimizada: 'dúvida operacional',
            dominio_previsto: 'infracao', confianca: 0.55, revisada: true,
            resultados: [{ tipo: 'ficha_mbft', id: '763-31' }],
            dominio_esperado: 'pop',
            resultados_esperados: [
              { tipo: 'pop', id: '003' },
              { tipo: 'artigo_ctb', id: 'art. 5' },
            ],
          }] })
        : url === '/api/admin/providers' ? ({ providers: [] })
          : ({ banco: 'ok', bancoEscrita: 'ok', embeddings: 'ok', esquemaRag: 10, avisos: [] }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<AdminRagFineTuning />);
    expect(await screen.findByDisplayValue('pop:003, artigo_ctb:art. 5')).toBeInTheDocument();
    expect(screen.getByLabelText(/domínio esperado/i)).toHaveValue('pop');
    await user.click(screen.getByRole('button', { name: /salvar correção/i }));
    const chamada = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    const corpo = JSON.parse(String(chamada?.[1]?.body));
    expect(corpo.dominioEsperado).toBe('pop');
    expect(corpo.resultadosEsperados).toEqual([
      { tipo: 'pop', id: '003' },
      { tipo: 'artigo_ctb', id: 'art. 5' },
    ]);
  });

  it('preserva uma revisão válida sem nenhuma fonte esperada', async () => {
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => url === '/api/admin/intencoes'
        ? ({ exemplos: [{
            id: 'e3', consulta_anonimizada: 'consulta sem resposta oficial',
            dominio_previsto: 'infracao', confianca: 0.51, revisada: true,
            resultados: [{ tipo: 'ficha_mbft', id: '763-31' }],
            dominio_esperado: 'ctb', resultados_esperados: [],
          }] })
        : url === '/api/admin/providers' ? ({ providers: [] })
          : ({ banco: 'ok', bancoEscrita: 'ok', embeddings: 'ok', esquemaRag: 10, avisos: [] }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<AdminRagFineTuning />);
    const campo = await screen.findByLabelText(/IDs oficiais esperados/i);
    expect(campo).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /salvar correção/i }));
    const chamada = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({
      dominioEsperado: 'ctb', resultadosEsperados: [],
    });
  });
});
