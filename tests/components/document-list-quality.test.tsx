import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentList from '@/components/DocumentList';

const base = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  colecao: 'ctb' as const,
  titulo: 'CTB compilado',
  nome_arquivo: 'ctb.pdf',
  formato: 'pdf' as const,
  norma_id: 'ctb',
  tipo: 'lei',
  paginas: 100,
  caracteres: 1000,
  trechos: 50,
  trechos_sem_vetor: 0,
  criado_em: '2026-01-01T00:00:00.000Z',
  atualizado_em: '2026-01-01T00:00:00.000Z',
};

function resposta(documentos: unknown[]) {
  return {
    documentos,
    legado: [],
    pendentesVetor: 0,
    migracaoPendente: false,
    migracaoQualidadePendente: false,
    bancoConfigurado: true,
  };
}

describe('qualidade na lista de documentos', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('destaca documento antigo que precisa de revisão', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => resposta([{ ...base, fonte_oficial: null, versao: null, vigente_desde: null, conferido_em: null, situacao: 'revisar' }]),
    })) as unknown as typeof fetch;

    render(<DocumentList colecao="ctb" />);
    expect(await screen.findByText('Revisão necessária')).toBeInTheDocument();
  });

  it('mostra versão e data de conferência do documento vigente', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => resposta([{
        ...base,
        fonte_oficial: 'https://www.planalto.gov.br/',
        versao: 'CTB 2026',
        vigente_desde: '2024-01-01',
        conferido_em: '2026-09-01',
        situacao: 'vigente',
      }]),
    })) as unknown as typeof fetch;

    render(<DocumentList colecao="ctb" />);
    expect(await screen.findByText('versão: CTB 2026')).toBeInTheDocument();
    expect(screen.getByText('conferido em 01/09/2026')).toBeInTheDocument();
  });

  it('salva a revisão por PATCH e recarrega a lista', async () => {
    const antigo = { ...base, fonte_oficial: null, versao: null, vigente_desde: null, conferido_em: null, situacao: 'revisar' };
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => init?.method === 'PATCH' ? { documento: antigo } : resposta([antigo]),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<DocumentList colecao="ctb" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Revisar dados' }));
    await userEvent.type(screen.getByLabelText('Fonte oficial'), 'https://www.planalto.gov.br/');
    await userEvent.type(screen.getByLabelText('Versão'), 'CTB 2026');
    await userEvent.type(screen.getByLabelText('Vigente desde'), '2024-01-01');
    await userEvent.type(screen.getByLabelText('Conferido em'), '2026-09-01');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar metadados' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/documents', expect.objectContaining({ method: 'PATCH' })));
    const chamada = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(chamada?.[1]?.body as string)).toMatchObject({
      id: base.id,
      fonteOficial: 'https://www.planalto.gov.br/',
      versao: 'CTB 2026',
      vigenteDesde: '2024-01-01',
      conferidoEm: '2026-09-01',
      situacao: 'vigente',
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
