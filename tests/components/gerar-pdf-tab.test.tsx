import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GerarPDFTab from '@/components/GerarPDFTab';
import { THEMES } from '@/lib/pdf/themes';

const fetchMock = jest.fn();

describe('GerarPDFTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    // jsdom has no URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:ctb');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('renders the theme selector with every theme', () => {
    render(<GerarPDFTab />);

    expect(screen.getByRole('heading', { name: /Gerar Dossiê em PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument();

    const select = screen.getByLabelText('Tema') as HTMLSelectElement;
    expect(select.options).toHaveLength(THEMES.length);
  });

  it('starts with the optional sections enabled', () => {
    render(<GerarPDFTab />);

    expect(screen.getByLabelText(/Normas aplicáveis/)).toBeChecked();
    expect(screen.getByLabelText(/Projetos de lei em tramitação/)).toBeChecked();
  });

  it('posts the selected theme and sections and downloads the file', async () => {
    const usuario = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'MISS' },
      blob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
    });

    render(<GerarPDFTab />);

    await usuario.selectOptions(screen.getByLabelText('Tema'), 'velocidade');
    await usuario.click(screen.getByLabelText(/Jurisprudência/));
    await usuario.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, opcoes] = fetchMock.mock.calls[0];
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.temaId).toBe('velocidade');
    expect(corpo.secoes.jurisprudencia).toBe(false);
    expect(corpo.secoes.normas).toBe(true);

    await waitFor(() => expect(screen.getByText(/Dossiê gerado agora/)).toBeInTheDocument());
  });

  it('shows the error message returned by the API', async () => {
    const usuario = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Tema "x" não existe.' }),
    });

    render(<GerarPDFTab />);
    await usuario.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não existe');
  });

  it('surfaces a network failure', async () => {
    const usuario = userEvent.setup();
    fetchMock.mockRejectedValue(new Error('offline'));

    render(<GerarPDFTab />);
    await usuario.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
  });
});
