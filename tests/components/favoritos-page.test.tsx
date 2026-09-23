import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavoritosPage from '@/app/favoritos/page';
import { FAVORITES_STORAGE_KEY } from '@/lib/favorites/favorites';
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
  checklist_ait: [],
  erros_comuns: [],
  concurso_infracoes: [],
  crime_transito: false,
  categoria_cnh_exigida: 'qualquer',
  normas_relacionadas: [],
  jurisprudencia: [],
  explicacao_simples: '',
  exemplo_dia_a_dia: '',
  citacoes: [],
  cache_hit: false,
  tempo_ms: 42,
};

function salvarFavorito(): void {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify([{ id: 'codigo:516-91', salvo_em: '2026-02-03T10:00:00.000Z', card }])
  );
}

describe('FavoritosPage', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('shows an empty state with a way to consult', async () => {
    render(<FavoritosPage />);

    expect(await screen.findByText('Nenhum favorito ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer uma consulta' })).toHaveAttribute(
      'href',
      '/?form=1'
    );
  });

  it('lists a saved card and links back to the consultation', async () => {
    salvarFavorito();

    render(<FavoritosPage />);

    expect(await screen.findByText('Estacionar em local proibido')).toBeInTheDocument();
    expect(screen.getByText('516-91')).toBeInTheDocument();
    expect(screen.getByText('GRAVÍSSIMA')).toBeInTheDocument();
    expect(screen.getByText('R$ 293,47')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estacionar em local proibido' })).toHaveAttribute(
      'href',
      '/consulta?q=516-91'
    );
    expect(screen.getByText(/Salvo em 03\/02\/2026/)).toBeInTheDocument();
  });

  it('drops the card from the list when it is unfavorited', async () => {
    salvarFavorito();
    const usuario = userEvent.setup();

    render(<FavoritosPage />);
    await usuario.click(await screen.findByRole('button', { name: /Salvo/ }));

    expect(await screen.findByText('Nenhum favorito ainda')).toBeInTheDocument();
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe('[]');
  });

  it('clears every favorite', async () => {
    salvarFavorito();
    const usuario = userEvent.setup();

    render(<FavoritosPage />);
    await usuario.click(await screen.findByRole('button', { name: 'Limpar tudo' }));

    expect(await screen.findByText('Nenhum favorito ainda')).toBeInTheDocument();
  });
});
