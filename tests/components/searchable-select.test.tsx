import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SearchableSelect from '@/components/ui/SearchableSelect';

const options = [
  { value: '001', label: 'POP 001 — PREPARAÇÃO PARA O SERVIÇO (APLICA-SE A TODAS AS MODALIDADES)' },
  { value: '004', label: 'POP 004 — NÍVEIS DE RISCO NA ABORDAGEM POLICIAL' },
  { value: '005', label: 'POP 005 — ABORDAGEM POLICIAL' },
];

describe('SearchableSelect', () => {
  it('mantém opções longas em uma lista responsiva, pesquisável e selecionável', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SearchableSelect
        label="Selecione o procedimento"
        placeholder="Escolher POP"
        searchPlaceholder="Buscar por número ou nome"
        value=""
        options={options}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Selecione o procedimento' });
    expect(trigger).toHaveClass('w-full', 'min-w-0', 'max-w-full');
    await user.click(trigger);

    const listbox = screen.getByRole('listbox', { name: 'Selecione o procedimento' });
    expect(listbox).toHaveClass('max-w-full', 'overflow-x-hidden');

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por número ou nome' }), 'níveis');
    expect(within(listbox).getByRole('option', { name: /POP 004/i })).toBeVisible();
    expect(within(listbox).queryByRole('option', { name: /POP 001/i })).not.toBeInTheDocument();

    await user.click(within(listbox).getByRole('option', { name: /POP 004/i }));
    expect(onChange).toHaveBeenCalledWith('004');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
