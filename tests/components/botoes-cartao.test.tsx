import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotoesCartao from '@/components/BotoesCartao';
import { getFavorites } from '@/lib/favorites/favorites';
import { Enquadramento } from '@/lib/db/schema';
import { CartaoEstruturado } from '@/lib/response/response-types';

function enquadramento(overrides: Partial<Enquadramento> = {}): Enquadramento {
  return {
    id: '1',
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em local proibido',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 181, inciso XVII do CTB',
    medida_administrativa: 'Remoção obrigatória',
    responsavel: 'proprietario',
    criado_em: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const card: CartaoEstruturado = {
  tipo: 'codigo',
  sucesso: true,
  consulta: '516-91',
  enquadramento: enquadramento(),
  normas: [],
  checklist_ait: ['[ ] Fotografar o veículo'],
  erros_comuns: [],
  concurso_infracoes: [],
  crime_transito: false,
  categoria_cnh_exigida: 'qualquer',
  normas_relacionadas: [],
  jurisprudencia: [],
  explicacao_simples: 'Você estacionou em um lugar proibido.',
  exemplo_dia_a_dia: 'Um motorista estaciona em uma vaga de idoso.',
  citacoes: [],
  cache_hit: false,
  tempo_ms: 42,
};

// NOTE: user-event installs its own navigator.clipboard stub during setup(),
// so any stub has to be defined *after* userEvent.setup().
function definir(nome: string, valor: unknown): void {
  Object.defineProperty(navigator, nome, { value: valor, configurable: true });
}

describe('BotoesCartao', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves the card on the device and persists it', async () => {
    const usuario = userEvent.setup();
    render(<BotoesCartao card={card} />);

    const botao = screen.getByRole('button', { name: /Salvar/ });
    expect(botao).toHaveAttribute('aria-pressed', 'false');

    await usuario.click(botao);

    expect(screen.getByRole('button', { name: /Salvo/ })).toHaveAttribute('aria-pressed', 'true');
    expect(getFavorites()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo nos favoritos');
  });

  it('starts saved when the card is already a favorite', () => {
    localStorage.setItem(
      'ctb-favoritos',
      JSON.stringify([{ id: 'codigo:516-91', salvo_em: '2026-01-01T00:00:00.000Z', card }])
    );

    render(<BotoesCartao card={card} />);

    expect(screen.getByRole('button', { name: /Salvo/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the new state through onChange', async () => {
    const usuario = userEvent.setup();
    const onChange = jest.fn();
    render(<BotoesCartao card={card} onChange={onChange} />);

    await usuario.click(screen.getByRole('button', { name: /Salvar/ }));
    await usuario.click(screen.getByRole('button', { name: /Salvo/ }));

    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shares through the native share sheet when available', async () => {
    const usuario = userEvent.setup();
    const share = jest.fn().mockResolvedValue(undefined);
    definir('share', share);

    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const enviado = share.mock.calls[0][0];
    expect(enviado.title).toBe('CTB Agente');
    expect(enviado.text).toContain('516-91');
    expect(enviado.text).toContain('http://localhost/consulta?q=516-91');
    expect(screen.getByRole('status')).toHaveTextContent('compartilhado');
  });

  it('copies the card when there is no share sheet', async () => {
    const usuario = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    definir('share', undefined);
    definir('clipboard', { writeText });

    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('Estacionar em local proibido');
    expect(screen.getByRole('status')).toHaveTextContent('copiado para a área de transferência');
  });

  it('explains when the browser cannot share at all', async () => {
    const usuario = userEvent.setup();
    definir('share', undefined);
    definir('clipboard', undefined);

    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    expect(screen.getByRole('status')).toHaveTextContent('não permite compartilhar');
  });

  it('stays quiet when the user cancels the native sheet', async () => {
    const usuario = userEvent.setup();
    definir(
      'share',
      jest.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    );

    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
  });

  it('reports a share failure', async () => {
    const usuario = userEvent.setup();
    definir('share', jest.fn().mockRejectedValue(new Error('boom')));

    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Não foi possível compartilhar')
    );
  });
});
