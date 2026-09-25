import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotoesCartao from '@/components/BotoesCartao';
import { getFavorites } from '@/lib/favorites/favorites';
import { compartilharTexto } from '@/lib/share/send';
import { Enquadramento } from '@/lib/db/schema';
import { CartaoEstruturado } from '@/lib/response/response-types';

// The device transport has its own unit tests; here we only care that the
// component calls it and words the outcome correctly.
jest.mock('../../lib/share/send');

const compartilharMock = compartilharTexto as jest.MockedFunction<typeof compartilharTexto>;

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

describe('BotoesCartao', () => {
  beforeEach(() => {
    localStorage.clear();
    compartilharMock.mockReset();
    compartilharMock.mockResolvedValue('copiado');
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

  it('tells the parent after saving and after removing', async () => {
    const usuario = userEvent.setup();
    const onChange = jest.fn();
    render(<BotoesCartao card={card} onChange={onChange} />);

    await usuario.click(screen.getByRole('button', { name: /Salvar/ }));
    await usuario.click(screen.getByRole('button', { name: /Salvo/ }));

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('re-reads the store when the device refuses the write', async () => {
    const erroSilenciado = jest.spyOn(console, 'error').mockImplementation(() => {});
    const escrita = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const usuario = userEvent.setup();
    const onChange = jest.fn();
    render(<BotoesCartao card={card} onChange={onChange} />);

    await usuario.click(screen.getByRole('button', { name: /Salvar/ }));

    expect(screen.getByRole('button', { name: /Salvar/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível salvar no aparelho');
    expect(onChange).not.toHaveBeenCalled();

    escrita.mockRestore();
    erroSilenciado.mockRestore();
  });

  it('hands the card text and its public link to the transport', async () => {
    const usuario = userEvent.setup();
    render(<BotoesCartao card={card} />);

    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(compartilharMock).toHaveBeenCalledTimes(1));

    const [texto, titulo] = compartilharMock.mock.calls[0];
    expect(titulo).toBe('CTB Agente');
    expect(texto).toContain('Estacionar em local proibido');
    expect(texto).toContain('http://localhost/consulta?q=516-91');
    expect(screen.getByRole('status')).toHaveTextContent('copiado para a área de transferência');
  });

  it.each([
    ['compartilhado', 'Cartão compartilhado'],
    ['indisponivel', 'não permite compartilhar'],
    ['falhou', 'Não foi possível compartilhar'],
  ] as const)('words the %s outcome', async (resultado, mensagem) => {
    compartilharMock.mockResolvedValue(resultado);

    const usuario = userEvent.setup();
    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(mensagem));
  });

  it('stays quiet when the user dismisses the share sheet', async () => {
    compartilharMock.mockResolvedValue('cancelado');

    const usuario = userEvent.setup();
    render(<BotoesCartao card={card} />);
    await usuario.click(screen.getByRole('button', { name: /Compartilhar/ }));

    await waitFor(() => expect(compartilharMock).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
