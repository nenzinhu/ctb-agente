import { fireEvent, render, screen } from '@testing-library/react';
import ComparisonProvider, { CompareFichaButton } from '@/components/comparison/ComparisonProvider';
import type { FichaMbft } from '@/lib/mbft/parser';
const fichas = require('../../data/acervo/mbft-fichas.json').slice(0, 4) as FichaMbft[];
it('limita a seleção a três fichas com um único aviso junto à tentativa', () => {
  render(<ComparisonProvider>{fichas.map(f => <CompareFichaButton key={f.codigo} ficha={f} />)}</ComparisonProvider>);
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getAllByRole('button', { name: 'Incluir na comparação' })[0]);
  expect(screen.getAllByRole('button', { name: 'Retirar da comparação' })).toHaveLength(3);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
});
