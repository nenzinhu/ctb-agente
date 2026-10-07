// Unit tests for query routing
import { codigoMbft, identifyQueryType, normalizeQuery } from '@/lib/query/router';

describe('Query Router', () => {
  describe('identifyQueryType', () => {
    it('should identify code query (XXX-XX format)', () => {
      expect(identifyQueryType('516-91')).toBe('code');
      expect(identifyQueryType('200-00')).toBe('code');
    });

    it('should not match code for non-matching patterns', () => {
      expect(identifyQueryType('51691')).toBe('code');
      expect(identifyQueryType('5169-1')).toBe('code');
      expect(identifyQueryType('código 516 91')).toBe('code');
      expect(identifyQueryType('5-16-91')).not.toBe('code');
    });

    it('should identify article query', () => {
      expect(identifyQueryType('art. 165')).toBe('article');
      expect(identifyQueryType('Art. 165')).toBe('article');
      expect(identifyQueryType('artigo 165')).toBe('article');
      expect(identifyQueryType('§ 1º')).toBe('article');
      expect(identifyQueryType('inc')).toBe('article');
      expect(identifyQueryType('alínea')).toBe('article');
    });

    it('should identify situation query', () => {
      expect(identifyQueryType('moto sem retrovisor')).toBe('situation');
      expect(identifyQueryType('carro estacionado de forma irregular')).toBe(
        'situation'
      );
      expect(identifyQueryType('multa por excesso de velocidade')).toBe(
        'situation'
      );
    });

    it('should be case insensitive for articles', () => {
      expect(identifyQueryType('ART. 165')).toBe('article');
      expect(identifyQueryType('Article 165')).toBe('article');
    });
  });

  describe('normalizeQuery', () => {
    it('should lowercase the query', () => {
      expect(normalizeQuery('HELLO World')).toBe('hello world');
    });

    it('should remove accents', () => {
      expect(normalizeQuery('café')).toBe('cafe');
      expect(normalizeQuery('açúcar')).toBe('acucar');
      expect(normalizeQuery('direção')).toBe('direcao');
    });

    it('should trim whitespace', () => {
      expect(normalizeQuery('  hello  ')).toBe('hello');
    });

    it('should handle Portuguese text', () => {
      const result = normalizeQuery('Está disponível');
      expect(result).toBe('esta disponivel');
    });
  });
});


describe('codigoMbft', () => {
  it.each(['516-91', '51691', '5169-1', '516 91', 'código 516–91'])('normalizes %s without changing its digits', (consulta) => {
    expect(codigoMbft(consulta)).toBe('516-91');
  });
  it.each(['5-16-91', '516-912', '123456', 'ABC51691DEF', 'art. 165', 'POP 201.4.19'])('does not guess a code from %s', (consulta) => {
    expect(codigoMbft(consulta)).toBeNull();
  });
});
