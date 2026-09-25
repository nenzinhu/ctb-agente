import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemaToggle from '@/components/TemaToggle';

describe('TemaToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.tema;
  });

  it('starts in the default theme', () => {
    render(<TemaToggle />);

    expect(screen.getByRole('button', { name: /Modo sol$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(document.documentElement.dataset.tema).toBe('padrao');
  });

  it('switches to the high-contrast theme and persists it', async () => {
    const usuario = userEvent.setup();
    render(<TemaToggle />);

    await usuario.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.tema).toBe('sol');
    expect(localStorage.getItem('ctb-tema')).toBe('sol');
    expect(screen.getByRole('button', { name: /Modo sol: ativo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('restores the saved preference on mount', () => {
    localStorage.setItem('ctb-tema', 'sol');

    render(<TemaToggle />);

    expect(document.documentElement.dataset.tema).toBe('sol');
    expect(screen.getByRole('button', { name: /ativo/ })).toBeInTheDocument();
  });

  it('toggles back to the default theme', async () => {
    const usuario = userEvent.setup();
    localStorage.setItem('ctb-tema', 'sol');
    render(<TemaToggle />);

    await usuario.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.tema).toBe('padrao');
    expect(localStorage.getItem('ctb-tema')).toBe('padrao');
  });
});
