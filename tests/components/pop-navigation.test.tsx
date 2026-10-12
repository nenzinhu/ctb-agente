import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopsEncontrados } from '@/components/pop/PopConsulta';
import type { Pop } from '@/lib/pop/parser';

function pop(numero: string, titulo: string, referencia?: string): Pop {
  return {
    numero,
    titulo,
    estabelecido: '-',
    atualizado: '-',
    execucao: 'Policial militar',
    material: [],
    fundamentacao: [],
    sequencia: referencia ? [{ texto: `Consultar o POP ${referencia}.`, nivel: 0 }] : [],
    atividadesCriticas: [],
    errosEvitar: [],
    anexos: [],
    pagina: 1,
  };
}

describe('navegação entre POPs relacionados', () => {
  const inicial = pop('001', 'Abordagem', '002');
  const relacionado = pop('002', 'Busca pessoal');

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => relacionado,
    }) as jest.Mock;
  });

  afterEach(() => jest.restoreAllMocks());

  it('abre uma referência válida e permite voltar e avançar pelo histórico', async () => {
    const usuario = userEvent.setup();
    render(
      <PopsEncontrados
        pops={[inicial]}
        catalogo={[
          { numero: '001', titulo: 'Abordagem' },
          { numero: '002', titulo: 'Busca pessoal' },
        ]}
      />
    );

    await usuario.click(screen.getByRole('button', { name: /abrir pop 002.*busca pessoal/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /busca pessoal/i })).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/pop/002');
    expect(screen.getByText('POP 001 → POP 002')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'POP anterior' }));
    expect(screen.getByRole('heading', { name: /abordagem/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Próximo POP' }));
    expect(screen.getByRole('heading', { name: /busca pessoal/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Voltar ao POP inicial' }));
    expect(screen.getByRole('heading', { name: /abordagem/i })).toBeInTheDocument();
  });
});
