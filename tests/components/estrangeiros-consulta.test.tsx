import { act, fireEvent, render, screen } from '@testing-library/react';
import EstrangeirosConsulta from '@/components/estrangeiros/EstrangeirosConsulta';

describe('EstrangeirosConsulta', () => {
  it('oferece consulta livre e fiscalização guiada sem pedir dados pessoais', () => {
    render(<EstrangeirosConsulta />);

    expect(screen.getByRole('heading', { name: /consulta rápida/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/descreva a situação/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fiscalização guiada/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome|cpf|passaporte|placa/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resolução contran nº 933\/2022/i })).toHaveAttribute('href', '/documentos/estrangeiros/resolucao-contran-933-2022.pdf');
    expect(screen.getByRole('link', { name: /decreto nº 86.714\/1981/i })).toHaveAttribute('href', '/documentos/estrangeiros/decreto-86714-1981.pdf');
    expect(screen.getByRole('link', { name: /países signatários.*convenção de viena/i })).toHaveAttribute('href', '/documentos/estrangeiros/paises-convencao-viena-reciprocidade.pdf');
  });

  it('mostra perguntas pendentes e alternativas em linhas visíveis', () => {
    render(<EstrangeirosConsulta />);
    fireEvent.change(screen.getByLabelText(/país emissor/i), { target: { value: 'AR' } });
    fireEvent.click(screen.getByRole('button', { name: /analisar situação/i }));

    expect(screen.getByRole('heading', { name: /dados que ainda precisam/i })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /possíveis enquadramentos/i })).not.toBeInTheDocument();
  });
});

it('mostra a data original e a revisão pendente sem validar a fonte pelo registro de conferência', () => {
  render(<EstrangeirosConsulta />);
  expect(screen.getByText(/conteúdo atualizado em 30 de julho de 2019/i)).toBeInTheDocument();
  expect(screen.getAllByText(/conferência registrada no acervo: 12\/10\/2026.*não equivale/i)).toHaveLength(3);
  expect(screen.getAllByText(/situação no acervo: requer revisão/i)).toHaveLength(3);
  expect(screen.getByText(/pendente de confirmação em fonte oficial/i)).toBeInTheDocument();
});

it('identifica falha do serviço e a análise local e permite repetir a consulta', async () => {
  const fetchMock = jest.fn().mockRejectedValue(new Error('offline'));
  global.fetch = fetchMock;
  render(<EstrangeirosConsulta />);
  fireEvent.change(screen.getByLabelText(/descreva a situação/i), { target: { value: 'argentino com carteira vencida' } });
  fireEvent.click(screen.getByRole('button', { name: /interpretar consulta/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/análise local/i);
  expect(screen.getByRole('heading', { name: /trechos do acervo recuperados/i })).toBeInTheDocument();
  expect(screen.getAllByText(/pendente de confirmação em fonte oficial/i).length).toBeGreaterThan(1);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await screen.findByRole('alert');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('limita a espera e cancela a consulta ao desmontar', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() => new Promise(() => {})) as typeof fetch;
  const { unmount } = render(<EstrangeirosConsulta />);
  fireEvent.change(screen.getByLabelText(/descreva a situação/i), { target: { value: 'argentino' } });
  fireEvent.click(screen.getByRole('button', { name: /interpretar consulta/i }));
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent(/tempo de espera terminou/i);
  expect(screen.getByRole('alert')).toHaveTextContent(/análise local/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  const signal = (global.fetch as jest.Mock).mock.calls[1][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  jest.useRealTimers();
});
