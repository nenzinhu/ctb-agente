import { render, screen, waitFor } from '@testing-library/react';
import OfflinePage from '@/app/offline/page';
jest.mock('../../lib/offline/store', () => ({ lerPacote: async () => null }));
describe('OfflinePage', () => {
  it('oferece download explícito e esclarece os limites do acervo', async () => {
    render(<OfflinePage />);
    expect(screen.getByRole('heading', { name: 'Consulta offline' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar pacote offline' })).toBeEnabled());
    expect(screen.getByText(/Uma cópia offline não confirma vigência/)).toBeInTheDocument();
    expect(screen.getByText(/Documentos enviados ao painel administrativo não entram automaticamente/)).toBeInTheDocument();
  });
});
