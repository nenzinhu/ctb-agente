import { render, screen } from '@testing-library/react';

const mockContextRevert = jest.fn();
const mockMediaRevert = jest.fn();
const mockTimelineFrom = jest.fn().mockReturnThis();
const mockTimelineFromTo = jest.fn().mockReturnThis();
const mockTimeline = jest.fn(() => ({
  from: mockTimelineFrom,
  fromTo: mockTimelineFromTo,
}));
const mockMediaAdd = jest.fn((_query: string, callback: () => void) => callback());
const mockContext = jest.fn((callback: () => void, _scope: unknown) => {
  callback();
  return { revert: mockContextRevert };
});
const mockMatchMedia = jest.fn(() => ({ add: mockMediaAdd, revert: mockMediaRevert }));

jest.mock('gsap', () => ({
  gsap: {
    context: mockContext,
    matchMedia: mockMatchMedia,
    timeline: mockTimeline,
  },
}));

import { obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';

const DesenhoVeiculo = jest.requireActual<typeof import('../../components/pesos-dimensoes/DesenhoVeiculo')>(
  '../../components/pesos-dimensoes/DesenhoVeiculo',
).default;

describe('DesenhoVeiculo profissional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('numera os eixos e identifica os grupos técnicos na ordem do catálogo', () => {
    const configuracao = obterConfiguracao('truck-3-eixos')!;
    const { container } = render(<DesenhoVeiculo configuracao={configuracao} />);

    expect(screen.getByText('E1')).toBeInTheDocument();
    expect(screen.getByText('E2')).toBeInTheDocument();
    expect(screen.getByText('E3')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-eixo="true"]')).toHaveLength(3);

    const grupos = container.querySelectorAll('[data-grupo-eixo="true"]');
    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toHaveAttribute('aria-label', expect.stringMatching(/eixo dianteiro.*6\.000 kg/i));
    expect(grupos[1]).toHaveAttribute('aria-label', expect.stringMatching(/tandem traseiro.*17\.000 kg/i));
  });

  it('diferencia pneus simples e duplos e inclui detalhes de cabine e acoplamento', () => {
    const configuracao = obterConfiguracao('cavalo-3s3')!;
    const { container } = render(<DesenhoVeiculo configuracao={configuracao} />);

    expect(container.querySelectorAll('[data-pneus="simples"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-pneus="duplos"]')).toHaveLength(5);
    expect(container.querySelector('[data-elemento="cabine"]')).toBeInTheDocument();
    expect(container.querySelector('[data-elemento="parabrisa"]')).toBeInTheDocument();
    expect(container.querySelector('[data-elemento="chassi"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-acoplamento="true"]')).toHaveLength(1);
  });

  it('anima entrada, eixos, rótulos e engates somente quando movimento é permitido', () => {
    const configuracao = obterConfiguracao('rodotrem-9-eixos-aet')!;
    const { unmount } = render(<DesenhoVeiculo configuracao={configuracao} compacto />);

    expect(mockMediaAdd).toHaveBeenCalledWith('(prefers-reduced-motion: no-preference)', expect.any(Function));
    expect(mockTimeline).toHaveBeenCalledWith(expect.objectContaining({ defaults: expect.any(Object) }));
    expect(mockTimelineFrom).toHaveBeenCalledWith('[data-veiculo-corpo]', expect.objectContaining({ x: expect.any(Number), autoAlpha: 0 }));
    expect(mockTimelineFrom).toHaveBeenCalledWith('[data-eixo="true"]', expect.objectContaining({ scale: 0, stagger: expect.any(Number) }), expect.any(String));
    expect(mockTimelineFrom).toHaveBeenCalledWith('[data-eixo-rotulo="true"]', expect.objectContaining({ autoAlpha: 0 }), expect.any(String));
    expect(mockTimelineFromTo).toHaveBeenCalledWith('[data-acoplamento="true"]', expect.any(Object), expect.any(Object), expect.any(String));

    unmount();
    expect(mockMediaRevert).toHaveBeenCalledTimes(1);
    expect(mockContextRevert).toHaveBeenCalledTimes(1);
  });
});
