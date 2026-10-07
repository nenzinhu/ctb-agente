import { pareceRespostaEmIngles, promptReescreverEmPortugues, SISTEMA_PORTUGUES_BR } from '@/lib/ai/portugues';

describe('garantia de idioma da IA', () => {
  it('detecta texto predominantemente em inglês sem bloquear português ou códigos curtos', () => {
    expect(pareceRespostaEmIngles('The driver must stop the vehicle and show the requested documents.')).toBe(true);
    expect(pareceRespostaEmIngles('Stop the vehicle.')).toBe(true);
    expect(pareceRespostaEmIngles('O condutor deve parar o veículo e apresentar os documentos solicitados.')).toBe(false);
    expect(pareceRespostaEmIngles('CTB art. 165-A')).toBe(false);
  });

  it('define pt-BR globalmente e preserva identificadores na correção', () => {
    expect(SISTEMA_PORTUGUES_BR).toMatch(/português do Brasil.*não responda em inglês/i);
    expect(promptReescreverEmPortugues('Article 165-A [1]')).toMatch(/Preserve códigos, artigos.*Article 165-A \[1\]/s);
  });
});
