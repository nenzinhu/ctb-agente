import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopsSugeridos } from '@/components/pop/PopConsulta';

describe('PopsSugeridos', () => {
  it('deixa claro que alternativas próximas precisam de seleção humana', async () => {
    const selecionar = jest.fn();
    render(<PopsSugeridos sugestoes={[{ numero: '003', titulo: 'USO DE ALGEMA' }]} onSelect={selecionar} />);

    expect(screen.getByText(/sugestões próximas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /POP 003.*USO DE ALGEMA/i }));
    expect(selecionar).toHaveBeenCalledWith('POP 003');
  });
});
