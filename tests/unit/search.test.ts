// Unit tests for rank fusion (hybrid search)
import { reciprocalRankFusion, RRF_K } from '@/lib/search/fusion';

const linha = (id: string) => ({ id, numero_dispositivo: `art. ${id}`, texto: `texto ${id}` });

describe('reciprocalRankFusion', () => {
  it('puts first what both searches found near the top', () => {
    const texto = [linha('165'), linha('167'), linha('244')];
    const vetor = [linha('244'), linha('165'), linha('306')];

    const fundido = reciprocalRankFusion([texto, vetor]);
    expect(fundido.map((r) => r.id)).toEqual(['165', '244', '167', '306']);
  });

  it('uses only positions: a raw distance of 0 (perfect match) is not a low score', () => {
    // The old reranker summed `similarity` — really a cosine distance — so
    // the perfect match (distance 0) ranked last.
    const vetor = [
      { ...linha('165'), similarity: 0 },
      { ...linha('999'), similarity: 1.8 },
    ];
    expect(reciprocalRankFusion([vetor])[0].id).toBe('165');
  });

  it('scores each item with 1/(k + position)', () => {
    const [primeiro] = reciprocalRankFusion([[linha('1')], [linha('1')]]);
    expect(primeiro.score).toBeCloseTo(2 / (RRF_K + 1));
  });

  it('keeps every distinct item once and handles empty lists', () => {
    expect(reciprocalRankFusion([[], []])).toEqual([]);
    expect(reciprocalRankFusion([[linha('1'), linha('2')], [linha('2')]])).toHaveLength(2);
  });
});

import { expandirSinonimos } from '@/lib/search/sinonimos';

describe('expandirSinonimos', () => {
  it('adds the legal wording of field terms, with or without accents', () => {
    expect(expandirSinonimos('moto sem capacete')).toBe(
      'moto sem capacete motocicleta motoneta ciclomotor capacete de segurança'
    );
    expect(expandirSinonimos('recusou o bafômetro')).toContain('etilômetro');
    expect(expandirSinonimos('CNH vencida')).toContain('Carteira Nacional de Habilitação');
  });

  it('leaves questions without field slang untouched', () => {
    expect(expandirSinonimos('art. 165')).toBe('art. 165');
    // "motorista" is not "moto"
    expect(expandirSinonimos('motorista parado')).toBe('motorista parado');
  });
});

import { priorizarInfracoes } from '@/lib/search/hybrid';

describe('priorizarInfracoes', () => {
  const r = (numero_dispositivo: string, score: number) => ({ id: numero_dispositivo, numero_dispositivo, texto: '', score });

  it('puts the infraction ahead of a near-equal match (AIT before the crime)', () => {
    const ordem = priorizarInfracoes([r('art. 306', 1 / 61), r('art. 165', 1 / 62)]).map((x) => x.numero_dispositivo);
    expect(ordem).toEqual(['art. 165', 'art. 306']);
  });

  it('does not override a clearly better match', () => {
    const ordem = priorizarInfracoes([r('art. 281', 1 / 61), r('art. 230', 1 / 66)]).map((x) => x.numero_dispositivo);
    expect(ordem).toEqual(['art. 281', 'art. 230']);
  });
});
