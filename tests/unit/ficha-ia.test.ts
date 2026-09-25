import { interpretarFicha, montarPromptFicha } from '@/lib/rag/ficha-ia';

describe('ficha-ia', () => {
  it('asks for the sheet with the query in the prompt', () => {
    expect(montarPromptFicha('moto sem capacete')).toContain('"moto sem capacete"');
  });

  it('reads the JSON even with prose around it', () => {
    const ficha = interpretarFicha(
      'Claro! {"tipificacaoResumida":"Conduzir moto sem capacete","codigoEnquadramento":"703-01","gravidade":"Gravíssima","exemplosObservacoes":["Condutor sem capacete"]} Fim.'
    );
    expect(ficha?.codigoEnquadramento).toBe('703-01');
    expect(ficha?.gravidade).toBe('Gravíssima');
    expect(ficha?.amparoLegal).toBeNull();
    expect(ficha?.exemplosObservacoes).toEqual(['Condutor sem capacete']);
  });

  it('returns null for missing, broken or empty JSON', () => {
    expect(interpretarFicha('não sei')).toBeNull();
    expect(interpretarFicha('{ quebrado')).toBeNull();
    expect(interpretarFicha('{"gravidade": null}')).toBeNull();
  });

  it('drops wrong types instead of failing', () => {
    const ficha = interpretarFicha('{"pontuacao": 7, "infrator": {"x": 1}, "gravidade": "Grave", "exemplosObservacoes": "x"}');
    expect(ficha?.pontuacao).toBe('7');
    expect(ficha?.infrator).toBeNull();
    expect(ficha?.gravidade).toBe('Grave');
    expect(ficha?.exemplosObservacoes).toEqual([]);
  });
});
