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
  expect(screen.getByRole('tab', { name: 'Ferramentas' })).toHaveFocus();
  expect(screen.getByRole('link', { name: /Lista de Fatos PMSC/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByRole('link', { name: /Comprimir PDF/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
});
