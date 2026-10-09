import { render, screen } from '@testing-library/react';
import FichaPop from '@/components/pop/FichaPop';
import type { Pop } from '@/lib/pop/parser';

const pop: Pop = {
  numero: '003', titulo: 'USO DE ALGEMAS', estabelecido: '', atualizado: '', execucao: 'Guarnição PM', pagina: 1,
  material: [], sequencia: [], atividadesCriticas: [], errosEvitar: [], anexos: [],
  fundamentacao: [{ norma: 'Súmula Vinculante 11', especificacao: 'Uso excepcional' }],
};

describe('resultados responsivos', () => {
  it('mantém tabelas longas dentro de um contêiner rolável', () => {
    render(<FichaPop pop={pop} />);
    expect(screen.getByRole('table').parentElement).toHaveClass('mobile-table-scroll');
  });
});
