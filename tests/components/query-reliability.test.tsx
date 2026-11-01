import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Consulta from '@/app/consulta/content';
import PopBiblioteca from '@/components/pop/PopBiblioteca';
import PopConsulta from '@/components/pop/PopConsulta';
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('q=moto+sem+capacete') }));
jest.mock('../../components/ConsultaResult', () => function Result() { return <p>Resultado CTB</p>; });
jest.mock('../../components/SearchSuggestions', () => () => null);
jest.mock('../../components/TurnstileWidget', () => ({ __esModule: true, default: () => null, turnstileConfigurado: false }));
const response = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => data });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it('CTB reports malformed payload, retries and renders a valid card', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ card: { sucesso: true } }));
  render(<Consulta />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/inválida/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(await screen.findByText('Resultado CTB')).toBeInTheDocument();
});
it('CTB times out and aborts on unmount', async () => {
  jest.useFakeTimers(); let signal: AbortSignal | undefined;
  global.fetch = jest.fn((_url, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); });
  const view = render(<Consulta />);
  await act(async () => { await jest.advanceTimersByTimeAsync(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent(/tempo de espera/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  view.unmount(); expect(signal?.aborted).toBe(true);
});
it('POP library distinguishes load failure and empty library after retry', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({}, false));
  render(<PopBiblioteca />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/serviço|biblioteca/i);
  (global.fetch as jest.Mock).mockResolvedValue(response({ documentos: [], migracaoPendente: false, bancoConfigurado: true }));
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(await screen.findByText(/Nenhum POP indexado/i)).toBeInTheDocument();
});
it('POP reports no results distinctly from network errors and permits retry', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(response({ pergunta: 'teste', resposta: null, semResposta: true, fontes: [], cache_hit: false, tempo_ms: 0 }));
  render(<PopConsulta />);
  fireEvent.change(screen.getByLabelText('Sua pergunta sobre os POPs'), { target: { value: 'teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/conectar/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(await screen.findByText(/Não encontrei isso nos POPs indexados/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
it('POP times out without presenting no results and cancels a retry on unmount', async () => {
  jest.useFakeTimers(); let signal: AbortSignal | undefined;
  global.fetch = jest.fn((_url, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); });
  const view = render(<PopConsulta />);
  fireEvent.change(screen.getByLabelText('Sua pergunta sobre os POPs'), { target: { value: 'teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
  await act(async () => { await jest.advanceTimersByTimeAsync(25000); });
  expect(screen.getByRole('alert')).toHaveTextContent(/tempo de espera/i);
  expect(screen.queryByText(/Não encontrei isso nos POPs indexados/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  view.unmount(); expect(signal?.aborted).toBe(true);
});
it('POP library times out and cancels requests on unmount', async () => {
  jest.useFakeTimers(); const signals: AbortSignal[] = [];
  global.fetch = jest.fn((_url, init) => { signals.push(init?.signal as AbortSignal); return new Promise(() => {}); });
  const view = render(<PopBiblioteca />);
  await act(async () => { await jest.advanceTimersByTimeAsync(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent(/tempo de espera/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  view.unmount(); expect(signals.every((signal) => signal.aborted)).toBe(true);
});
it('POP shows a valid grounded answer and its real source excerpt', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ pergunta: 'teste', resposta: 'Confira a fonte [1].', semResposta: false, fontes: [{ n: 1, documento_id: 'real', titulo: 'Manual', secao: 'Seção 2', pagina: 8, texto: 'Trecho disponível.' }], cache_hit: false, tempo_ms: 0 }));
  render(<PopConsulta />);
  fireEvent.change(screen.getByLabelText('Sua pergunta sobre os POPs'), { target: { value: 'teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
  expect(await screen.findByText('Trecho disponível.')).toBeInTheDocument();
  expect(screen.getByText('Seção 2 · p. 8')).toBeInTheDocument();
});
it('manual access retries without AI and clears the previous selection', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response({ numero: '001', titulo: 'Abordagem', estabelecido: '-', atualizado: '-', execucao: '', material: [], fundamentacao: [], sequencia: [], atividadesCriticas: [], errosEvitar: [], anexos: [], pagina: 1 }));
  render(<PopConsulta catalogo={[{ numero: '001', titulo: 'Abordagem' }]} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Selecione o procedimento Escolher POP' }));
  fireEvent.click(screen.getByRole('option', { name: 'POP 001 — Abordagem' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/conectar/i);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(await screen.findByRole('heading', { name: /abordagem/i })).toBeInTheDocument();
});
it('manual rejects malformed HTTP 200 procedures before rendering a ficha', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({}));
  render(<PopConsulta catalogo={[{ numero: '001', titulo: 'Abordagem' }]} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Selecione o procedimento Escolher POP' }));
  fireEvent.click(screen.getByRole('option', { name: 'POP 001 — Abordagem' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/inválid/i);
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});
it('consultation rejects malformed nested POP sections before rendering', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ pergunta: 'teste', resposta: null, semResposta: false, fontes: [], pops: [{ numero: '001', titulo: 'Abordagem', material: [null] }] }));
  render(<PopConsulta />);
  fireEvent.change(screen.getByLabelText('Sua pergunta sobre os POPs'), { target: { value: 'teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/inválid/i);
});
