import { fireEvent, render, screen } from '@testing-library/react';
import HomeDashboard from '@/components/HomeDashboard';
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));

it.each([
  ['Estrangeiros', '/estrangeiros'], ['Pesos', '/pesos-dimensoes'], ['Fatos comunicantes', '/fatos-pmsc'], ['Consultar POPs', '/pop'], ['Ferramentas', '/ferramentas'],
])('abre %s diretamente sem outro botão intermediário', (name, href) => {
  render(<HomeDashboard />);
  expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
});
it('preserva a consulta ao consultar as instruções', () => {
  render(<HomeDashboard />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'art. 165' } });
  fireEvent.click(screen.getByRole('button', { name: 'Como pesquisar' }));
  fireEvent.click(screen.getByText('Voltar à consulta', { selector: 'button' }));
  expect(screen.getByRole('textbox')).toHaveValue('art. 165');
});
