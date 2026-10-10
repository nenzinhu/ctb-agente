import { FatoMatcher, normalizarTextoMatcher } from '@/lib/search/domain-matcher';

interface Registro {
  id: string;
  nome: string;
}

const registros: Registro[] = [
  { id: 'trafico', nome: 'Tráfico de drogas' },
  { id: 'arma', nome: 'Porte ou posse de arma branca ou simulacro' },
  { id: 'sossego', nome: 'Perturbação do trabalho ou sossego alheios' },
];

const matcher = new FatoMatcher({
  itens: registros,
  obterId: (item) => item.id,
  obterRotulo: (item) => item.nome,
  aliases: [
    { termos: ['boca de fumo', 'vendendo balinha'], destinos: ['trafico'] },
    { termos: ['faca', 'facão', 'canivete', 'triso'], destinos: ['arma'] },
    { termos: ['som alto', 'algazarra'], destinos: ['sossego'] },
  ],
  limiar: 75,
});

describe('FatoMatcher compartilhado', () => {
  it('normaliza caixa, acentos, pontuação e caracteres especiais', () => {
    expect(normalizarTextoMatcher('  PERTURBAÇÃO!!! c/ SOM-ALTO  ')).toBe('perturbacao com som alto');
  });

  it('retorna gíria exata com confiança e método estruturados', () => {
    expect(matcher.buscar('Tem uma boca de fumo na esquina', 3)[0]).toMatchObject({
      item: registros[0],
      scoreConfianca: expect.any(Number),
      metodoEncontrado: 'giria_exata',
      termosCorrespondentes: ['boca de fumo'],
    });
    expect(matcher.buscar('Tem uma boca de fumo na esquina', 3)[0].scoreConfianca).toBeGreaterThanOrEqual(95);
  });

  it('tolera erro grave na natureza oficial', () => {
    const resultado = matcher.buscar('trafico de drogras', 1)[0];
    expect(resultado).toMatchObject({ item: registros[0], metodoEncontrado: 'fuzzy_oficial' });
    expect(resultado.scoreConfianca).toBeGreaterThanOrEqual(75);
  });

  it('reconhece natureza oficial idêntica com confiança máxima', () => {
    expect(matcher.buscar('Perturbação do trabalho ou sossego alheios', 1)[0]).toMatchObject({
      item: registros[2],
      scoreConfianca: 100,
      metodoEncontrado: 'fuzzy_oficial',
    });
  });

  it('entende meia-palavra e rejeita consulta sem segurança', () => {
    expect(matcher.buscar('pertubacao do soss', 1)[0]?.item).toBe(registros[2]);
    expect(matcher.buscar('receita de bolo', 3)).toEqual([]);
  });
});
