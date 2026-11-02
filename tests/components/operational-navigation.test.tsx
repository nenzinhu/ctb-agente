import { fireEvent, render, screen } from '@testing-library/react';

let pathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));

import OperationalNavigation from '@/components/OperationalNavigation';

describe('OperationalNavigation', () => {
  beforeEach(() => { pathname = '/'; });

  it('organiza os módulos em cinco pilares operacionais', () => {
    render(<OperationalNavigation />);

    expect(screen.getByRole('navigation', { name: /pilares operacionais/i })).toBeInTheDocument();
    for (const label of ['Fiscalização', 'Pesos', 'Estrangeiros', 'Procedimentos', 'Utilitários e IA']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('expõe as sub-abas do pilar ativo sem esconder o destino atual', () => {
    pathname = '/fatos-pmsc';
    render(<OperationalNavigation />);

    expect(screen.getByRole('link', { name: /consulta ctb e mbft/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /fatos pmsc/i })).toHaveAttribute('aria-current', 'page');
  });

  it('abre o submenu quando o pilar recebe um toque ou clique', () => {
    render(<OperationalNavigation />);

    fireEvent.click(screen.getByRole('button', { name: /procedimentos/i }));

    expect(screen.getByRole('link', { name: /pops pmsc/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /casos práticos/i })).toBeVisible();
  });
});
