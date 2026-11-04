import { fireEvent, render, screen } from '@testing-library/react';
import CtbReaderProvider from '@/components/ctb/CtbReaderProvider';
import TextoReferenciasCtb from '@/components/TextoReferenciasCtb';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
it('abre a cópia do artigo com fonte e retorna à consulta sem navegar', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ artigo: { numero: '165', texto: 'Art. 165. Texto de teste do acervo.', fonte: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm#art165', versao: 'teste', aviso: 'Confira a vigência.' } }) } as Response));
  render(<CtbReaderProvider><p>Consulta preservada: <TextoReferenciasCtb texto="art. 165 do CTB" /></p></CtbReaderProvider>);
  fireEvent.click(screen.getByRole('link', { name: 'Abrir art. 165 no aplicativo' }));
  expect(await screen.findByText('Art. 165. Texto de teste do acervo.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Conferir no Planalto/ })).toHaveAttribute('target', '_blank');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar à consulta' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText(/Consulta preservada:/)).toBeInTheDocument();
});
it('mantém acesso à fonte quando o artigo não pode ser carregado', async () => {
  global.fetch = jest.fn(async () => { throw new Error('offline'); });
  render(<CtbReaderProvider><TextoReferenciasCtb texto="art. 165 do CTB" /></CtbReaderProvider>);
  fireEvent.click(screen.getByRole('link', { name: /no aplicativo/ }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Conferir no Planalto/ })).toHaveAttribute('href', expect.stringContaining('#art165'));
});
