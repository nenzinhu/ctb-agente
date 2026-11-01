import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentQueries from '@/components/RecentQueries';
import { saveQuery } from '@/lib/search/local-storage';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('consultas recentes locais', () => {
  beforeEach(() => { localStorage.clear(); mockPush.mockClear(); });
  it('explica a privacidade e remove todos os identificadores salvos', async () => {
    saveQuery('art. 165');
    render(<RecentQueries />);
    expect(screen.getByText(/apenas códigos e artigos/i)).toBeInTheDocument();
    expect(screen.getByText(/neste aparelho/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar consultas recentes' }));
    expect(screen.queryByRole('button', { name: 'art. 165' })).not.toBeInTheDocument();
    expect(localStorage.getItem('ctb-recent-queries')).toBeNull();
  });
  it('retoma uma referência e mantém o foco de teclado disponível', async () => {
    saveQuery('516-91');
    render(<RecentQueries />);
    await userEvent.click(screen.getByRole('button', { name: '516-91' }));
    expect(mockPush).toHaveBeenCalledWith('/consulta?q=516-91');
  });
});
