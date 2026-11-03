import { render, screen } from '@testing-library/react';
import TextoReferenciasCtb from '@/components/TextoReferenciasCtb';

it('abre o artigo citado no CTB oficial preservando a consulta', () => {
  render(<TextoReferenciasCtb texto="Confira o art. 165-A do CTB, inciso I." />);
  const link = screen.getByRole('link', { name: /Abrir art. 165-A/ });
  expect(link).toHaveAttribute('href', 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm#art165a');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByText(/do CTB, inciso I/)).toBeInTheDocument();
});

it('identifica referências abreviadas no amparo legal do CTB', () => {
  render(<TextoReferenciasCtb texto="Art. 230, V e artigo 165." contextoCtb />);
  expect(screen.getAllByRole('link')).toHaveLength(2);
});

it.each(['Art. 5º da Constituição Federal', 'art. 165 da Resolução 1.003', 'art. 144 do Código Penal', 'art. 999 do CTB', 'art. 5 sem identificação'])('não atribui ao CTB uma referência ambígua: %s', texto => {
  render(<TextoReferenciasCtb texto={texto} />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('não converte outro código mesmo dentro de uma explicação de trânsito', () => {
  render(<TextoReferenciasCtb texto="art. 144 do CP" contextoCtb />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
