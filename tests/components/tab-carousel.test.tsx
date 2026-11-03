import { fireEvent, render, screen } from '@testing-library/react';
import TabCarousel from '@/components/TabCarousel';

it('avança e volta a faixa de abas sem mudar o conteúdo selecionado', () => {
  const original = Object.getOwnPropertyDescriptors(HTMLElement.prototype);
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 900 });
  const scrollBy = jest.fn();
  HTMLElement.prototype.scrollBy = scrollBy;
  try {
    render(<TabCarousel activeKey="a"><button>Aba A</button><button>Aba B</button></TabCarousel>);
    expect(screen.getByRole('button', { name: 'Ver abas anteriores' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver próximas abas' }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 300 }));
    expect(screen.getByRole('button', { name: 'Aba A' })).toBeInTheDocument();
  } finally {
    for (const key of ['clientWidth', 'scrollWidth', 'scrollBy']) {
      if (original[key]) Object.defineProperty(HTMLElement.prototype, key, original[key]);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
    }
  }
});
