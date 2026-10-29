import { fireEvent, render, screen } from '@testing-library/react';
import CasosPraticos from '@/components/CasosPraticos';
import type { CasoPratico } from '@/lib/mbft/casos';

const caso = (codigo: string, infracao: string, extra: Partial<CasoPratico> = {}): CasoPratico => ({
  codigo,
  infracao,
  amparo: 'Art. 165-A',
  gravidade: 'Gravíssima',
  medidaAdministrativa: 'Recolhimento do documento de habilitação',
  crime: null,
  exemplos: ['Condutor recusou-se a realizar o teste do etilômetro.'],
  quandoAutuar: ['Recusa ao teste.'],
  quandoNaoAutuar: ['Condutor que realizou o teste.'],
  pagina: 1,
  ...extra,
});

describe('CasosPraticos (consulta de campo)', () => {
  it('mostra só a conduta oficial, com como descrever, quando autuar e quando NÃO autuar', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tema: 'recusou o bafômetro',
        principais: [caso('757-90', 'Recusar-se a ser submetido a teste')],
        relacionadas: [caso('516-91', 'Dirigir sob a influência de álcool', { crime: 'Art. 306 e 310 do CTB' })],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<CasosPraticos />);

    fireEvent.click(screen.getByRole('button', { name: 'recusou o bafômetro' }));
    expect(await screen.findByText('Conduta indicada para “recusou o bafômetro”')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/casos?tema=recus' + 'ou%20o%20baf%C3%B4metro', { cache: 'no-store' });
    expect(screen.getByText('757-90')).toBeInTheDocument();
    expect(screen.getAllByText('Quando NÃO autuar').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Como descrever no AIT/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Situações parecidas \(1\) — confira os critérios/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ficha completa de 757-90/ })).toHaveAttribute('href', '/consulta?q=757-90');
    // No quiz: nothing to pick as right or wrong
    expect(screen.queryByText(/Acertou|Não foi dessa vez|Placar/)).not.toBeInTheDocument();
  });

  it('mostra a mensagem quando não há ficha para o tema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Nenhuma ficha do MBFT para “xyz”.' }),
    }) as unknown as typeof fetch;
    render(<CasosPraticos />);
    fireEvent.change(screen.getByLabelText('Qual é a situação?'), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver a conduta/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma ficha do MBFT para “xyz”');
  });
});
