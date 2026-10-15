import { render, screen } from '@testing-library/react';

import ConsultaModes from '@/components/ConsultaModes';

describe('ConsultaModes', () => {
  it('oferece somente as abas CTB e POP', () => {
    render(<ConsultaModes atual="ctb" />);

    expect(screen.getByRole('link', { name: /consulta ctb/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /pop-pmsc/i })).toHaveAttribute('href', '/pop');
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
