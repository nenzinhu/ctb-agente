import { fireEvent, render, screen } from '@testing-library/react';
import CasosPraticos from '@/components/CasosPraticos';
import type { Caso } from '@/lib/mbft/casos';

const caso: Caso = {
  cena: 'Condutor realizou teste de etilômetro, resultado 0,20 mg/L.',
  correta: '516-91',
  gravidade: 'Gravíssima',
  explicacao: 'Tomou cerveja e foi dirigir? É infração gravíssima.',
  opcoes: [
    { codigo: '757-90', rotulo: 'Recusar o teste', amparo: 'Art. 165-A.' },
    { codigo: '516-91', rotulo: 'Dirigir sob a influência de álcool.', amparo: 'Art. 165.' },
    { codigo: '516-92', rotulo: 'Dirigir sob substância psicoativa.', amparo: 'Art. 165.' },
    { codigo: '501-00', rotulo: 'Dirigir sem CNH.', amparo: 'Art. 162, I.' },
  ],
};

describe('CasosPraticos', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => caso }) as unknown as typeof fetch;
  });

  it('mostra a cena, corrige na hora e soma o placar', async () => {
    render(<CasosPraticos />);
    expect(await screen.findByText(/etilômetro/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Recusar o teste/ }));
    expect(screen.getByText(/Não foi dessa vez\. O certo é 516-91/)).toBeInTheDocument();
    expect(screen.getByText(/Explicando fácil/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ficha completa de 516-91/ })).toHaveAttribute('href', '/consulta?q=516-91');
    expect(screen.getByText(/de 1/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ctb-casos-placar')!)).toEqual({ acertos: 0, total: 1 });
  });

  it('conta o acerto', async () => {
    render(<CasosPraticos />);
    fireEvent.click(await screen.findByRole('button', { name: /influência de álcool/ }));
    expect(screen.getByText(/Acertou!/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ctb-casos-placar')!)).toEqual({ acertos: 1, total: 1 });
  });
});
