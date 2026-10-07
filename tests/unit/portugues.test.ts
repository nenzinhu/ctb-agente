import { pareceRespostaEmIngles, promptReescreverEmPortugues, SISTEMA_PORTUGUES_BR } from '@/lib/ai/portugues';

describe('garantia de idioma da IA', () => {
  it('detecta texto em inglês e respostas que misturam inglês com português', () => {
    expect(pareceRespostaEmIngles('The driver must stop the vehicle and show the requested documents.')).toBe(true);
    expect(pareceRespostaEmIngles('Stop the vehicle.')).toBe(true);
    expect(pareceRespostaEmIngles('O condutor deve parar. Then show the documents before proceeding.')).toBe(true);
    expect(pareceRespostaEmIngles(`${'O procedimento deve seguir o texto oficial do CTB. '.repeat(15)} Summary: driver must stop.`)).toBe(true);
    expect(pareceRespostaEmIngles('O condutor deve parar o veículo e apresentar os documentos solicitados.')).toBe(false);
    expect(pareceRespostaEmIngles('Use o cinto. Use sempre o capacete.')).toBe(false);
    expect(pareceRespostaEmIngles('CTB art. 165-A')).toBe(false);
  });

  it('define pt-BR globalmente e preserva identificadores na correção', () => {
    expect(SISTEMA_PORTUGUES_BR).toMatch(/português do Brasil.*não escreva.*em inglês.*não misture idiomas/i);
    expect(promptReescreverEmPortugues('Article 165-A [1]')).toMatch(/Preserve códigos, artigos.*Article 165-A \[1\]/s);
  });
});
