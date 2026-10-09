import { render, screen } from '@testing-library/react';

const mockContextRevert = jest.fn();
const mockMediaRevert = jest.fn();
const mockFrom = jest.fn();
const mockMediaAdd = jest.fn((_query: string, callback: () => void) => callback());
const mockContext = jest.fn((callback: () => void, _scope: unknown) => {
  callback();
  return { revert: mockContextRevert };
});
const mockMatchMedia = jest.fn(() => ({
  add: mockMediaAdd,
  revert: mockMediaRevert,
}));

jest.mock('gsap', () => ({
  gsap: {
    context: mockContext,
    matchMedia: mockMatchMedia,
    from: mockFrom,
  },
}));
jest.mock('gsap/dist/gsap', () => ({
  gsap: {
    context: mockContext,
    matchMedia: mockMatchMedia,
    from: mockFrom,
  },
}));

const HomeReveal = jest.requireActual<typeof import('../../components/HomeReveal')>(
  '../../components/HomeReveal',
).default;

describe('HomeReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mantém o conteúdo no HTML e restringe a animação ao movimento permitido', () => {
    const { container } = render(
      <HomeReveal>
        <section data-home-reveal>Conteúdo operacional</section>
      </HomeReveal>,
    );

    expect(screen.getByText('Conteúdo operacional')).toBeVisible();
    expect(mockContext).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ current: container.firstChild }));
    expect(mockMediaAdd).toHaveBeenCalledWith(
      '(prefers-reduced-motion: no-preference)',
      expect.any(Function),
    );
    expect(mockFrom).toHaveBeenCalledWith('[data-home-reveal]', expect.objectContaining({
      autoAlpha: 0,
      y: 12,
      duration: 0.45,
      stagger: expect.any(Number),
    }));
  });

  it('remove contexto e consulta de mídia ao desmontar', () => {
    const { unmount } = render(<HomeReveal><p data-home-reveal>Teste</p></HomeReveal>);

    unmount();

    expect(mockMediaRevert).toHaveBeenCalledTimes(1);
    expect(mockContextRevert).toHaveBeenCalledTimes(1);
  });
});
