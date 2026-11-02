import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FatosPmscConsulta from '@/components/fatos-pmsc/FatosPmscConsulta';

const fetchMock = jest.fn();

describe('FatosPmscConsulta', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('mostra alternativas para conferência sem selecionar uma decisão', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({
      decisaoAutomatica: false,
      alternativas: [
        { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'mais compatível', scoreConfianca: 98, metodoEncontrado: 'giria_exata' },
        { grupo: 'Perturbação', natureza: 'Perturbação da tranquilidade', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'alternativa próxima', scoreConfianca: 80, metodoEncontrado: 'contexto_lexical' },
      ],
    }) });

    render(<FatosPmscConsulta />);
    await userEvent.type(screen.getByLabelText(/descreva o fato/i), 'som alto na casa do vizinho');
    await userEvent.click(screen.getByRole('button', { name: /consultar lista/i }));

    expect(await screen.findByText('Perturbação do trabalho ou sossego alheios')).toBeInTheDocument();
    expect(screen.getByText('Perturbação da tranquilidade')).toBeInTheDocument();
    expect(screen.getByText(/confira as alternativas/i)).toBeInTheDocument();
    expect(screen.getByText(/fonte de origem:.*10\/06\/2019/i)).toBeInTheDocument();
    expect(screen.getByText(/98%.*gíria exata/i)).toBeInTheDocument();
    expect(screen.getAllByText(/versão de 10\/06\/2019.*página 22/i)).toHaveLength(2);
    expect(screen.getByRole('region', { name: /naturezas encontradas/i })).toHaveClass('mobile-results-enter');
    expect(screen.getByText('Perturbação do trabalho ou sossego alheios').closest('article')).toHaveClass('mobile-result-card');
  });
});

it('distingue ausência de resultados de falha e permite nova tentativa', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ message: 'Serviço indisponível' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ alternativas: [] }) });
  global.fetch = fetchMock;
  render(<FatosPmscConsulta />);
  fireEvent.change(screen.getByLabelText(/descreva o fato/i), { target: { value: 'som alto' } });
  fireEvent.click(screen.getByRole('button', { name: /consultar lista/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível');
  expect(screen.queryByText('Nenhuma correspondência segura.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(await screen.findByText('Nenhuma correspondência segura.')).toBeInTheDocument();
});

it('rejeita resposta sem alternativas em vez de indicar ausência de resultados', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  render(<FatosPmscConsulta />);
  fireEvent.click(screen.getByRole('button', { name: 'som alto' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/resposta inválida/i);
});

it('encerra consulta sem resposta no limite e cancela ao desmontar', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() => new Promise(() => {})) as typeof fetch;
  const { unmount } = render(<FatosPmscConsulta />);
  fireEvent.click(screen.getByRole('button', { name: 'som alto' }));
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent(/tempo de espera terminou/i);
  expect(screen.getByRole('button', { name: /consultar lista/i })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  const signal = (global.fetch as jest.Mock).mock.calls[1][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  jest.useRealTimers();
});
