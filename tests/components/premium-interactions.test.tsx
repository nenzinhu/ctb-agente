import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import Field from '@/components/ui/Field';
import PopConsulta from '@/components/pop/PopConsulta';
import LoginPage from '@/app/admin/login/page';
import SearchSuggestions from '@/components/SearchSuggestions';
jest.mock('../../components/TurnstileWidget', () => ({ __esModule: true, default: () => null, turnstileConfigurado: false }));

it('limpa a pesquisa sem alterar o rótulo e devolve o foco ao campo', () => {
  function Exemplo() {
    const [valor, setValor] = useState('art. 165');
    return <Field label="Pesquisar" value={valor} onChange={e => setValor(e.target.value)} onClear={() => setValor('')} />;
  }
  render(<Exemplo />);
  fireEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
  expect(screen.getByRole('textbox', { name: 'Pesquisar' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: 'Pesquisar' })).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Limpar pesquisa' })).not.toBeInTheDocument();
});

it('cancela a consulta POP ao limpar e não exibe a resposta antiga', async () => {
  let resolver!: (r: Response) => void;
  let signal: AbortSignal | undefined;
  global.fetch = jest.fn((_url, init) => { signal = init?.signal as AbortSignal; return new Promise<Response>(resolve => { resolver = resolve; }); });
  render(<PopConsulta />);
  fireEvent.change(screen.getByLabelText('Sua pergunta sobre os POPs'), { target: { value: 'abordagem' } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
  expect(signal?.aborted).toBe(true);
  expect(screen.getByLabelText('Sua pergunta sobre os POPs')).toHaveValue('');
  expect(screen.getByLabelText('Sua pergunta sobre os POPs')).toHaveFocus();
  await act(async () => { resolver({ ok: true, json: async () => ({ semResposta: false, fontes: [], resposta: 'RESPOSTA ANTIGA' }) } as Response); });
  expect(screen.queryByText('RESPOSTA ANTIGA')).not.toBeInTheDocument();
});

it('valida login localmente, associa o erro e foca o primeiro campo inválido', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ configured: true }) } as Response));
  render(<LoginPage />);
  await act(async () => {});
  fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
  expect(screen.getByLabelText('Usuário')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Usuário')).toHaveFocus();
  expect(screen.getByText('Informe o usuário.')).toBeInTheDocument();
  expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('mantém a senha preenchida quando o servidor recusa o login', async () => {
  global.fetch = jest.fn(async (_url, init) => ({ ok: !init?.method, json: async () => init?.method ? { message: 'Credenciais inválidas.' } : { configured: true } } as Response));
  render(<LoginPage />);
  await act(async () => {});
  fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'agente' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-de-teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Credenciais inválidas.')).toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toHaveValue('senha-de-teste');
  expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
});

it('ignora sugestões antigas depois de limpar e iniciar uma nova pesquisa', async () => {
  jest.useFakeTimers();
  const resolvers: Array<(r: Response) => void> = [];
  global.fetch = jest.fn(() => new Promise<Response>(resolve => resolvers.push(resolve)));
  try {
    const { rerender } = render(<SearchSuggestions query="baf" fonte="ctb" onSelect={() => {}} />);
    await act(async () => { jest.advanceTimersByTime(299); });
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1); });
    rerender(<SearchSuggestions query="" fonte="ctb" onSelect={() => {}} />);
    rerender(<SearchSuggestions query="cinto" fonte="ctb" onSelect={() => {}} />);
    await act(async () => { jest.advanceTimersByTime(300); });
    const response = (titulo: string) => ({ ok: true, json: async () => ({ sugestoes: [{ tipo: 'artigo', titulo, valor: titulo, detalhe: '' }] }) } as Response);
    await act(async () => { resolvers[0](response('Sugestão antiga')); });
    expect(screen.queryByText('Sugestão antiga')).not.toBeInTheDocument();
    await act(async () => { resolvers[1](response('Sugestão atual')); });
    expect(screen.getByText('Sugestão atual')).toBeInTheDocument();
  } finally { jest.useRealTimers(); }
});
