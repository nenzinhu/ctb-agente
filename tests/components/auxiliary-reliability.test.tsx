import { act, fireEvent, render, screen } from '@testing-library/react';
import Professor from '@/components/Professor';
import CasosPraticos from '@/components/CasosPraticos';
import PerguntasPesos from '@/components/pesos-dimensoes/PerguntasPesos';
import CalculadoraPesos from '@/components/pesos-dimensoes/CalculadoraPesos';

const flows = [
  { name: 'Professor', Component: Professor, label: /Sua pergunta/, text: 'moto sem capacete', button: /^Perguntar$/, timeout: 30000 },
  { name: 'casos', Component: CasosPraticos, label: /Qual é a situação/, text: 'moto sem capacete', button: /Ver a conduta/, timeout: 15000 },
  { name: 'pesos', Component: PerguntasPesos, label: /Dúvida sobre pesos/, text: 'peso em kg', button: /Consultar fontes/, timeout: 15000 },
  { name: 'calculadora', Component: CalculadoraPesos, label: /tara do veículo/i, text: '9000', button: /Calcular fiscalização/i, timeout: 15000 },
];

describe.each(flows)('$name: consultas limitadas', ({ Component, label, text, button, timeout, name }) => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });
  function submit() {
    fireEvent.change(screen.getByLabelText(label), { target: { value: text } });
    if (name === 'calculadora') fireEvent.change(screen.getByLabelText(/peso da carga na nota/i), { target: { value: '14000' } });
    fireEvent.click(screen.getByRole('button', { name: button }));
  }
  it('termina uma requisição parada, preserva entrada e permite nova tentativa', async () => {
    const fetchMock = jest.fn().mockImplementation(() => new Promise(() => {}));
    global.fetch = fetchMock;
    render(<Component />);
    submit();
    await act(async () => { jest.advanceTimersByTime(timeout); });
    expect(screen.getByText(/tempo de espera terminou/i)).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveValue(text);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('distingue falha de conexão e oferece nova tentativa sem apagar a entrada', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    global.fetch = fetchMock;
    render(<Component />);
    submit();
    await act(async () => {});
    expect(screen.getByText(/Não foi possível conectar ao serviço/)).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveValue(text);
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Consultar/ })).toBeInTheDocument();
  });
  it('cancela o transporte ao sair da tela', () => {
    const fetchMock = jest.fn().mockImplementation(() => new Promise(() => {}));
    global.fetch = fetchMock;
    const view = render(<Component />);
    submit();
    const signal = fetchMock.mock.calls[0][1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});


it('Professor recupera após timeout e identifica resposta oficial local', async () => {
  jest.useFakeTimers();
  const fetchMock = jest.fn().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce({
    ok: true, json: async () => ({ resposta: 'Trecho oficial de teste', fontes: [], modelo: null, local: true }),
  });
  global.fetch = fetchMock;
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  render(<Professor />);
  fireEvent.click(screen.getByRole('button', { name: 'Recusar o bafômetro dá multa?' }));
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(screen.getByLabelText(/Sua pergunta/)).toHaveValue('Recusar o bafômetro dá multa?');
  fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }));
  await act(async () => {});
  expect(screen.getByText('Trecho oficial de teste')).toBeInTheDocument();
  expect(screen.getByText(/Resposta rápida montada diretamente das fontes oficiais/)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  jest.useRealTimers();
});
