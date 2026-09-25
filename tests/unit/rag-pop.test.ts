import { ehSemResposta, montarPrompt, referenciaDaFonte, SEM_RESPOSTA, validarCitacoes, type FontePop } from '@/lib/rag/pop';
import { formatarResposta, trechosInline } from '@/lib/rag/formatar-resposta';

const fonte = (n: number, extra: Partial<FontePop> = {}): FontePop => ({
  n,
  documento_id: `d${n}`,
  titulo: 'POP 1.01 — Abordagem a pessoas',
  secao: '3. SEQUÊNCIA DAS AÇÕES',
  pagina: 2,
  texto: `Texto do trecho ${n}.`,
  ...extra,
});

describe('POP RAG prompt', () => {
  it('numbers every excerpt with its reference and keeps the model on them', () => {
    const prompt = montarPrompt('Quando algemar?', [fonte(1), fonte(2, { secao: null, pagina: null })]);

    expect(prompt).toContain('[1] POP 1.01 — Abordagem a pessoas · 3. SEQUÊNCIA DAS AÇÕES · p. 2\nTexto do trecho 1.');
    expect(prompt).toContain('[2] POP 1.01 — Abordagem a pessoas\nTexto do trecho 2.');
    expect(prompt).toContain('usando exclusivamente os TRECHOS');
    expect(prompt).toContain(SEM_RESPOSTA);
    expect(prompt.trim().endsWith('RESPOSTA:')).toBe(true);
    expect(prompt).toContain('PERGUNTA: Quando algemar?');
  });

  it('formats a source reference without empty parts', () => {
    expect(referenciaDaFonte({ titulo: 'POP 2', secao: null, pagina: 7 })).toBe('POP 2 · p. 7');
  });
});

describe('validarCitacoes', () => {
  it('keeps citations to real excerpts and drops invented ones', () => {
    const { texto, citadas } = validarCitacoes('Algemar havendo fundada suspeita [2]. Registrar no boletim [9].', 3);
    expect(texto).toBe('Algemar havendo fundada suspeita [2]. Registrar no boletim.');
    expect(citadas).toEqual([2]);
  });

  it('recognizes the "not in the POPs" answer', () => {
    expect(ehSemResposta(SEM_RESPOSTA)).toBe(true);
    expect(ehSemResposta('Posicionar a viatura [1].')).toBe(false);
  });
});

describe('formatarResposta', () => {
  it('builds paragraphs, numbered steps, bullets, bold and citations', () => {
    const blocos = formatarResposta(
      'Na abordagem, siga **sempre** a sequência [1]:\n\n1. Informar a central [1].\n2. Posicionar a viatura [2].\n\n- Não algemar sem motivo [3].'
    );

    expect(blocos.map((b) => b.tipo)).toEqual(['paragrafo', 'numerada', 'lista']);
    expect(blocos[0]).toEqual({
      tipo: 'paragrafo',
      conteudo: [
        { tipo: 'texto', valor: 'Na abordagem, siga ' },
        { tipo: 'negrito', valor: 'sempre' },
        { tipo: 'texto', valor: ' a sequência ' },
        { tipo: 'citacao', n: 1 },
        { tipo: 'texto', valor: ':' },
      ],
    });
    expect(blocos[1].tipo === 'numerada' && blocos[1].itens).toHaveLength(2);
  });

  it('never produces HTML from the model output', () => {
    expect(trechosInline('<img src=x onerror=alert(1)>')).toEqual([
      { tipo: 'texto', valor: '<img src=x onerror=alert(1)>' },
    ]);
  });
});
