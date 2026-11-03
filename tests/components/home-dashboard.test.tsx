import { fireEvent, render, screen } from '@testing-library/react';
import HomeDashboard from '@/components/HomeDashboard';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));


it('troca apenas o painel e preserva a consulta digitada entre abas', () => {
  render(<HomeDashboard />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'art. 165' } });
  fireEvent.click(screen.getByRole('tab', { name: 'POPs' }));
  expect(screen.getByRole('tab', { name: 'POPs' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('link', { name: 'Consultar POPs' })).toHaveAttribute('href', '/pop');
  fireEvent.click(screen.getByRole('tab', { name: 'Consultar' }));
  expect(screen.getByRole('textbox')).toHaveValue('art. 165');
});

it('disponibiliza todas as ferramentas por paginação e aceita navegação por teclado', () => {
  render(<HomeDashboard />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Consultar' }), { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Fatos comunicantes' })).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Consultar fatos comunicantes' })).toHaveAttribute('href', '/fatos-pmsc');
  fireEvent.click(screen.getByRole('tab', { name: 'Ferramentas' }));
  expect(screen.getByRole('link', { name: /Lista de Fatos PMSC/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByRole('link', { name: /Comprimir PDF/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
});

it('permite avançar e voltar pelas setas laterais da página inicial', () => {
  render(<HomeDashboard />);
  expect(screen.getByRole('button', { name: 'Voltar à aba anterior' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Avançar à próxima aba' }));
  expect(screen.getByRole('tab', { name: 'POPs' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar à aba anterior' }));
  expect(screen.getByRole('tab', { name: 'Consultar' })).toHaveAttribute('aria-selected', 'true');
});

 it.each([
  ['Estrangeiros', 'Consultar estrangeiros', '/estrangeiros'],
  ['Pesos', 'Abrir calculadora de pesos', '/pesos-dimensoes'],
 ])('acessa a nova aba %s', (tab, action, href) => {
  render(<HomeDashboard />);
  fireEvent.click(screen.getByRole('tab', { name: tab }));
  expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('link', { name: action })).toHaveAttribute('href', href);
 });
