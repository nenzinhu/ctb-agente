import { render, screen } from '@testing-library/react';
import OfflinePage from '@/app/offline/page';

describe('OfflinePage', () => {
  it('explica o limite jurídico e oferece retorno seguro', () => {
    render(<OfflinePage />);
    expect(screen.getByRole('heading', { name: 'Você está sem conexão' })).toBeInTheDocument();
    expect(screen.getByText(/consultas jurídicas atuais exigem internet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
  });
});
