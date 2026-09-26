import { agruparFontesPorPop, ehSemResposta, montarPrompt, referenciaDaFonte, SEM_RESPOSTA, validarCitacoes, type FontePop } from '@/lib/rag/pop';
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

  it('asks for an organized answer: summary, steps, warnings and legal basis', () => {
    const prompt = montarPrompt('Quando algemar?', [fonte(1)]);

    for (const secao of ['**Resumo**', '**Passo a passo**', '**Atenção**', '**Base legal**']) {
      expect(prompt).toContain(secao);
    }
    expect(prompt).toContain('use só as seções que os trechos sustentam');
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

describe('agruparFontesPorPop', () => {
  it('groups the excerpts under their POP, best-ranked POP first', () => {
    const grupos = agruparFontesPorPop([
      fonte(1, { secao: 'POP 002 — BUSCA PESSOAL › SEQUÊNCIA DAS AÇÕES', pagina: 7 }),
      fonte(2, { secao: 'POP 003 — USO DE ALGEMA › ERROS A SEREM EVITADOS', pagina: 13 }),
      fonte(3, { secao: 'POP 002 — BUSCA PESSOAL › ATIVIDADES CRÍTICAS', pagina: null }),
    ]);

    expect(grupos.map((g) => g.pop)).toEqual(['POP 002 — BUSCA PESSOAL', 'POP 003 — USO DE ALGEMA']);
    expect(grupos[0].fontes.map((f) => [f.n, f.local])).toEqual([
      [1, 'SEQUÊNCIA DAS AÇÕES · p. 7'],
      [3, 'ATIVIDADES CRÍTICAS'],
    ]);
  });

  it('groups excerpts outside a numbered POP under their document', () => {
    const [grupo] = agruparFontesPorPop([fonte(1, { titulo: 'Manual de abordagem', secao: '2. TÉCNICAS', pagina: 4 })]);

    expect(grupo.pop).toBe('Manual de abordagem');
    expect(grupo.fontes[0].local).toBe('2. TÉCNICAS · p. 4');
  });
});

describe('formatarResposta with section titles', () => {
  it('turns a bold or ## line into a section title', () => {
    const blocos = formatarResposta('**Resumo**\nAlgemar só com fundada suspeita [1].\n## Passo a passo\n1. Verbalizar [2]\n**Base legal:**\n- Súmula Vinculante 11 [3]');

    expect(blocos.map((b) => b.tipo)).toEqual(['titulo', 'paragrafo', 'titulo', 'numerada', 'titulo', 'lista']);
    expect(blocos.filter((b) => b.tipo === 'titulo').map((b) => (b as { valor: string }).valor)).toEqual([
      'Resumo',
      'Passo a passo',
      'Base legal',
    ]);
  });

  it('keeps bold inside a sentence as bold, not a title', () => {
    const [bloco] = formatarResposta('Use **sempre** a algema com trava [1].');
    expect(bloco.tipo).toBe('paragrafo');
  });
});
