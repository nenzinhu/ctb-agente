import { render, screen } from '@testing-library/react';
import FichaPop from '@/components/pop/FichaPop';
import type { Pop } from '@/lib/pop/parser';

const pop: Pop = {
  numero: '003', titulo: 'USO DE ALGEMAS', estabelecido: '', atualizado: '', execucao: 'Guarnição PM', pagina: 1,
  material: [], sequencia: [], atividadesCriticas: [], errosEvitar: [], anexos: [],
  fundamentacao: [{ norma: 'Súmula Vinculante 11', especificacao: 'Uso excepcional' }],
};

describe('resultados responsivos', () => {
  it('empilha a fundamentação no celular e mantém a tabela a partir de md', () => {
    const { container } = render(<FichaPop pop={pop} />);

    const tabela = screen.getByRole('table');
    // A tabela não força mais largura mínima: nada de rolagem horizontal.
    expect(tabela).not.toHaveClass('min-w-[34rem]');
    expect(tabela.parentElement).toHaveClass('hidden', 'md:block');

    const listaMobile = container.querySelector('ul.md\\:hidden');
    expect(listaMobile).not.toBeNull();
    expect(listaMobile).toHaveTextContent('Súmula Vinculante 11');
    expect(listaMobile).toHaveTextContent('Uso excepcional');
  });
});
