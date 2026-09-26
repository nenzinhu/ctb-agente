import { expandirSinonimos, semPalavrasDePergunta } from '@/lib/search/sinonimos';
import { semTextoRepetido } from '@/lib/search/fusion';
import { chaveDoArquivo } from '@/lib/ingestion/formats';
import { pdfTextForUpload } from '@/lib/ingestion/pdf-text';

describe('semPalavrasDePergunta', () => {
  it('keeps the subject of the question and drops the question words', () => {
    expect(semPalavrasDePergunta('quando posso algemar alguém')).toBe('quando algemar');
    expect(semPalavrasDePergunta('Qual o procedimento correto para fazer a busca?')).toBe('Qual o para a busca?');
  });

  it('keeps the question when nothing else is left', () => {
    expect(semPalavrasDePergunta('como fazer?')).toBe('como');
    expect(semPalavrasDePergunta('pode')).toBe('pode');
  });
});

describe('expandirSinonimos (POP vocabulary)', () => {
  it.each([
    ['quando usar o taser', 'dispositivo eletrônico de incapacitação'],
    ['uso de spray de pimenta', 'espargidor solução lacrimogênea'],
    ['disparo de bala de borracha', 'munição de elastômero'],
    ['protesto bloqueando a rua', 'manifestação'],
    ['cavalo solto na pista', 'animal em via pública'],
    ['transporte de preso na viatura', 'condução de preso em viatura'],
    ['lavrar termo circunstanciado', 'lavratura de BO-TC'],
    ['adolescente apreendido', 'ocorrência envolvendo crianças e adolescentes'],
  ])('%s → %s', (pergunta, termos) => {
    expect(expandirSinonimos(pergunta)).toContain(termos);
  });
});

describe('semTextoRepetido', () => {
  it('keeps the first of two excerpts with the same text, whatever the spacing or accents', () => {
    const itens = [
      { id: 'a', texto: 'Art. 165. Dirigir sob a influência de álcool.' },
      { id: 'b', texto: 'Art. 165.  Dirigir sob a influencia de alcool.' },
      { id: 'c', texto: 'Art. 165-A. Recusar-se a ser submetido a teste.' },
    ];
    expect(semTextoRepetido(itens).map((i) => i.id)).toEqual(['a', 'c']);
  });
});

describe('chaveDoArquivo', () => {
  it('gives the same key to the same document in another format or copy', () => {
    const chave = chaveDoArquivo('mbvt20222.pdf');
    expect(chaveDoArquivo('mbvt20222.txt')).toBe(chave);
    expect(chaveDoArquivo('MBVT20222 (1).pdf')).toBe(chave);
    expect(chaveDoArquivo('mbvt20222 (somente texto).pdf')).toBe(chave);
    expect(chaveDoArquivo('pop-consolidado (1).pdf')).toBe(chaveDoArquivo('pop consolidado.txt'));
  });

  it('keeps different documents apart', () => {
    expect(chaveDoArquivo('resolucao-432.pdf')).not.toBe(chaveDoArquivo('resolucao-433.pdf'));
  });
});

describe('pdfTextForUpload', () => {
  it('keeps the page structure for the indexer: page markers and line breaks, no running headers', () => {
    const pagina = (n: number) =>
      ['Manual de POP PMSC', `Linha de conteúdo ${n}.`, `Passo ${n} ainda sem ponto`, `e sua continuação ${n}.`, String(n)].join('\n');
    const texto = pdfTextForUpload([pagina(1), pagina(2), pagina(3)]);

    expect(texto).toContain('--- Página 2 ---\nLinha de conteúdo 2.\nPasso 2 ainda sem ponto\ne sua continuação 2.');
    expect(texto).not.toMatch(/Manual de POP PMSC|^[123]$/m);
  });
});
