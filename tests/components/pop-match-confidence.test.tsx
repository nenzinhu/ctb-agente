import { render, screen } from '@testing-library/react';

import { PopsEncontrados } from '@/components/pop/PopConsulta';
import type { Pop } from '@/lib/pop/parser';

const pop: Pop = {
  numero: '002',
  titulo: 'ABORDAGEM A PESSOA EM ATITUDE SUSPEITA',
  estabelecido: '23/12/2011',
  atualizado: '27/03/2018',
  execucao: 'Guarnição PM',
  material: [],
  fundamentacao: [],
  sequencia: [],
  atividadesCriticas: [],
  errosEvitar: [],
  anexos: [],
  pagina: 1,
  scoreConfianca: 98,
  metodoEncontrado: 'giria_exata',
};

describe('confiança do POP encontrado', () => {
  it('mostra a confiança e o método acima da ficha', () => {
    render(<PopsEncontrados pops={[pop]} />);
    expect(screen.getByText(/98%.*gíria exata/i)).toBeInTheDocument();
  });
});
