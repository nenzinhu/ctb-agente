import { fireEvent, render, screen } from '@testing-library/react';
import Header from '@/components/Header';
import PageViewport from '@/components/PageViewport';
import EstrangeirosConsulta from '@/components/estrangeiros/EstrangeirosConsulta';
beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; });

jest.mock('next/navigation', () => ({ usePathname: () => '/estrangeiros' }));
jest.mock('../../components/InstalarApp', () => () => null);

it('oferece um único controle de leitura, sem setas laterais no modo de rolagem', () => {
  document.documentElement.dataset.readingMode = 'scroll';
  render(<><Header /><PageViewport><p>Texto para leitura</p></PageViewport></>);
  expect(screen.getAllByRole('group', { name: 'Modo de leitura do conteúdo' })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Rolar texto' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Páginas do conteúdo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Navegação lateral' })).not.toBeInTheDocument();
  delete document.documentElement.dataset.readingMode;
});

it('deixa documentos e preenchimento manual sob demanda e preserva os campos', () => {
  render(<EstrangeirosConsulta />);
  const manual = screen.getByText('Preencher dados manualmente').closest('details')!;
  expect(manual).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('Preencher dados manualmente'));
  expect(screen.getByLabelText(/país emissor/i)).toBeVisible();
  fireEvent.change(screen.getByLabelText(/país emissor/i), { target: { value: 'AR' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analisar situação' }));
  expect(screen.getByRole('heading', { name: /dados que ainda precisam/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/país emissor/i)).toHaveValue('AR');
});
