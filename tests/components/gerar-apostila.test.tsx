import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GerarApostila from '@/components/GerarApostila';

const baixarArquivo = jest.fn();
const pdfDeBlocos = jest.fn();
jest.mock('../../lib/download', () => ({ baixarArquivo: (...args: unknown[]) => baixarArquivo(...args) }));
jest.mock('../../lib/pdf-tools/pdf-writer', () => ({ pdfDeBlocos: (...args: unknown[]) => pdfDeBlocos(...args) }));

const fetchMock = jest.fn();
const documentos = [
  {
    id: '11111111-1111-4111-8111-111111111111', titulo: 'Resolução CONTRAN nº 882/2021',
    colecao: 'ctb', paginas: 93, paginaMaximaDisponivel: 93, trechos: 20, situacao: 'vigente',
  },
  {
    id: '22222222-2222-4222-8222-222222222222', titulo: 'Manual de POP PMSC',
    colecao: 'pop', paginas: 200, paginaMaximaDisponivel: 198, trechos: 30, situacao: 'revisar',
  },
  {
    id: '33333333-3333-4333-8333-333333333333', titulo: 'CTB antigo',
    colecao: 'ctb', paginas: 900, paginaMaximaDisponivel: null, trechos: 50, situacao: 'vigente',
  },
];

const resposta = (corpo: unknown, ok = true) => Promise.resolve({
  ok,
  json: async () => corpo,
  arrayBuffer: async () => new ArrayBuffer(4),
});

describe('GerarApostila', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation(() => resposta({ documentos, bancoConfigurado: true }));
    pdfDeBlocos.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  });

  it('lista todo o acervo com situação, coleção e público Agentes', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);

    expect(await screen.findByText('Resolução CONTRAN nº 882/2021')).toBeInTheDocument();
    expect(screen.getByText('Manual de POP PMSC')).toBeInTheDocument();
    expect(screen.getByText('Em revisão')).toBeInTheDocument();
    await usuario.click(screen.getByLabelText('Resolução CONTRAN nº 882/2021'));
    expect(screen.getByLabelText('Agentes')).toBeChecked();
    expect(screen.queryByText(/em formação/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/apostila');
  });

  it('inicia na etapa Documento e avança para Conteúdo após a escolha', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);

    await screen.findByText('Resolução CONTRAN nº 882/2021');
    const etapas = screen.getByRole('list', { name: 'Etapas da apostila' });
    expect(etapas.querySelectorAll('li')[0]).toHaveAttribute('aria-current', 'step');

    await usuario.click(screen.getByLabelText('Resolução CONTRAN nº 882/2021'));
    expect(etapas.querySelectorAll('li')[1]).toHaveAttribute('aria-current', 'step');
  });

  it('pesquisa documentos por título ou conteúdo', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);
    await screen.findByText('Manual de POP PMSC');

    await usuario.type(screen.getByLabelText('Pesquisar documentos'), 'algemas');
    await usuario.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/apostila?q=algemas'));
  });

  it('gera por intervalos e baixa PDF com identidade institucional', async () => {
    const usuario = userEvent.setup();
    fetchMock.mockImplementation((entrada: RequestInfo | URL, opcoes?: RequestInit) => {
      if (String(entrada) === '/brasao-cpmrv.jpg') return resposta({});
      if (opcoes?.method === 'POST') return resposta({
        titulo: 'Pesos e dimensões', selecaoRotulo: 'páginas 10–11',
        documento: documentos[1],
        capitulos: [{
          id: 'c1', titulo: 'Parte 1 — Manual de POP PMSC', texto: '## Objetivos\n- Entender.',
          paginas: [10, 11], situacao: 'revisar', modelo: 'Groq · llama',
        }],
      });
      return resposta({ documentos, bancoConfigurado: true });
    });
    render(<GerarApostila />);
    await screen.findByText('Manual de POP PMSC');

    await usuario.click(screen.getByLabelText('Manual de POP PMSC'));
    expect(screen.getByRole('alert')).toHaveTextContent(/em revisão/i);
    await usuario.click(screen.getByLabelText('Páginas selecionadas'));
    await usuario.type(screen.getByLabelText('Intervalos de páginas'), '10-11');
    await usuario.clear(screen.getByLabelText('Título da apostila'));
    await usuario.type(screen.getByLabelText('Título da apostila'), 'Pesos e dimensões');
    await usuario.click(screen.getByRole('button', { name: 'Gerar apostila' }));

    await screen.findByRole('heading', { name: 'Prévia' });
    const chamada = fetchMock.mock.calls.find(([, opcoes]) => opcoes?.method === 'POST');
    expect(JSON.parse(chamada?.[1]?.body as string)).toEqual({
      documentoId: documentos[1].id,
      selecao: { modo: 'paginas', intervalos: '10-11' },
      publico: 'agente',
      titulo: 'Pesos e dimensões',
    });

    await usuario.click(screen.getByRole('button', { name: 'Baixar PDF' }));
    await waitFor(() => expect(pdfDeBlocos).toHaveBeenCalledWith(
      'Pesos e dimensões', expect.arrayContaining([
        expect.objectContaining({ texto: 'Documento de origem: Manual de POP PMSC' }),
        expect.objectContaining({ texto: 'Seleção: páginas 10–11' }),
        expect.objectContaining({ texto: 'Situação documental: Em revisão' }),
        expect.objectContaining({ texto: expect.stringMatching(/revisão humana/i) }),
      ]), undefined,
      expect.objectContaining({ instituicao: 'Polícia Militar Rodoviária de Santa Catarina' })
    ));
    expect(baixarArquivo).toHaveBeenCalled();
  });

  it('impede intervalos quando as páginas antigas não foram indexadas', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);
    await screen.findByText('CTB antigo');

    await usuario.click(screen.getByLabelText('CTB antigo'));
    expect(screen.getByLabelText('Documento inteiro')).toBeDisabled();
    expect(screen.getByLabelText('Páginas selecionadas')).toBeDisabled();
    expect(screen.getByText(/reindexado.*escolha manual/i)).toBeInTheDocument();
    expect(screen.queryByText(/modo inteiro continua disponível/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar apostila' })).toBeDisabled();
  });

  it('exige escolha manual de até dez páginas em documentos maiores', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);
    await screen.findByText('Manual de POP PMSC');

    await usuario.click(screen.getByLabelText('Manual de POP PMSC'));

    expect(screen.getByLabelText('Documento inteiro')).toBeDisabled();
    expect(screen.getByLabelText('Páginas selecionadas')).toBeChecked();
    expect(screen.getByText(/selecione manualmente até 10 páginas/i)).toBeInTheDocument();
  });

  it('não envia uma seleção manual com mais de dez páginas', async () => {
    const usuario = userEvent.setup();
    render(<GerarApostila />);
    await screen.findByText('Manual de POP PMSC');

    await usuario.click(screen.getByLabelText('Manual de POP PMSC'));
    await usuario.type(screen.getByLabelText('Intervalos de páginas'), '1-11');
    await usuario.click(screen.getByRole('button', { name: 'Gerar apostila' }));

    expect(await screen.findByText('Selecione no máximo 10 páginas por apostila.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, opcoes]) => opcoes?.method === 'POST')).toBe(false);
  });
});
