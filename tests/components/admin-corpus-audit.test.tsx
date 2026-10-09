import { render, screen, waitFor } from '@testing-library/react';
import AdminCorpusAudit from '@/components/admin/AdminCorpusAudit';

describe('AdminCorpusAudit', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        corpus: { documentos: 1, trechos: 250, vetoresPendentes: 3, ctbIndexado: true },
        enquadramentos: {
          totalBanco: 1, totalMbft: 411, duplicados: [],
          itens: [{ codigo: '516-91', fichaEncontrada: false, exemploSeed: true, divergencias: [], revisaoHumana: ['valor_multa'] }],
        },
      }),
    }) as jest.Mock;
  });

  it('mostra estado do corpus e não oferece correção automática', async () => {
    render(<AdminCorpusAudit />);
    expect(await screen.findByText('CTB indexado')).toBeInTheDocument();
    expect(screen.getByText(/3 trechos sem vetor/)).toBeInTheDocument();
    expect(screen.getByText('516-91')).toBeInTheDocument();
    expect(screen.getByText('Exemplo do seed')).toBeInTheDocument();
    expect(screen.getByText(/valor da multa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /corrigir automaticamente/i })).not.toBeInTheDocument();
  });

  it('expõe falha de leitura como alerta', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<AdminCorpusAudit />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível revisar'));
  });
});
