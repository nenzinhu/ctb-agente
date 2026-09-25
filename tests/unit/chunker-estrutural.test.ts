import { chunkText } from '@/lib/ingestion/chunker';
import { pageMarker } from '@/lib/ingestion/pdf-text';

// Real CTB wording (Lei 9.503/97), including the planalto.gov.br habit of
// printing the old wording of art. 165 right before the current one.
const CTB = `CAPÍTULO XV
DAS INFRAÇÕES

Art. 164. Permitir que pessoa nas condições referidas nos incisos do art. 162 tome posse do veículo automotor e passe a conduzi-lo na via:

Infração - as mesmas previstas nos incisos do art. 162;

Penalidade - as mesmas previstas no art. 162.

Art. 165. Dirigir sob a influência de álcool, em nível superior a seis decigramas por litro de sangue: (Redação dada pela Lei nº 11.275, de 2006)
Infração - gravíssima;
Penalidade - multa (cinco vezes) e suspensão do direito de dirigir;

Art. 165. Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência:

Infração - gravíssima;

Penalidade - multa (dez vezes) e suspensão do direito de dirigir por 12 (doze) meses.

Medida administrativa - recolhimento do documento de habilitação e retenção do veículo, observado o disposto no § 4º do art. 270 da Lei nº 9.503, de 23 de setembro de 1997 - do Código de Trânsito Brasileiro.

Parágrafo único. Aplica-se em dobro a multa prevista no caput em caso de reincidência no período de até 12 (doze) meses.

Art. 165-A. Recusar-se a ser submetido a teste, exame clínico, perícia ou outro procedimento que permita certificar influência de álcool ou outra substância psicoativa, na forma estabelecida pelo art. 277:

Infração - gravíssima;`;

describe('chunkText — legal mode', () => {
  const chunks = chunkText(CTB);
  const byLabel = (label: string) => chunks.filter((c) => c.numero_dispositivo === label);

  it('starts a new excerpt at every article, never mixing two of them', () => {
    expect(chunks.map((c) => c.numero_dispositivo)).toEqual(['art. 164', 'art. 165', 'art. 165-A']);
    expect(byLabel('art. 164')[0].text).not.toMatch(/Art\. 165/);
  });

  it('labels by the heading, not by articles the text only cites', () => {
    // The old chunker labeled this excerpt "art. 270" (cited in the text).
    const art165 = byLabel('art. 165')[0];
    expect(art165.text).toContain('§ 4º do art. 270');
    expect(chunks.some((c) => c.numero_dispositivo === 'art. 270')).toBe(false);
  });

  it('keeps "-A" articles apart from the base article', () => {
    expect(byLabel('art. 165-A')[0].text).toMatch(/^Art\. 165-A\. Recusar-se/);
  });

  it('keeps only the current wording when a compiled law repeats an article', () => {
    const texto = chunks.map((c) => c.text).join('\n');
    expect(texto).toContain('multa (dez vezes)');
    expect(texto).not.toContain('multa (cinco vezes)');
  });

  it('carries the chapter heading as the section', () => {
    expect(chunks.every((c) => c.section === 'CAPÍTULO XV — DAS INFRAÇÕES')).toBe(true);
  });

  it('nests sections under their chapter and drops legislative notes from headings', () => {
    const texto = [
      'CAPÍTULO II',
      'DO SISTEMA NACIONAL DE TRÂNSITO',
      '',
      'Seção I',
      'Disposições Gerais',
      '',
      'Art. 5º O Sistema Nacional de Trânsito é o conjunto de órgãos e entidades.',
      '',
      'CAPÍTULO III-A',
      '(Incluído pela Lei nº 12.619, de 2012) (Vigência)',
      '',
      'DA CONDUÇÃO DE VEÍCULOS POR MOTORISTAS PROFISSIONAIS',
      '',
      'Art. 67-A. O disposto neste Capítulo aplica-se aos motoristas profissionais.',
    ].join('\n');
    expect(chunkText(texto).map((c) => c.section)).toEqual([
      'CAPÍTULO II — DO SISTEMA NACIONAL DE TRÂNSITO › Seção I — Disposições Gerais',
      'CAPÍTULO III-A › DA CONDUÇÃO DE VEÍCULOS POR MOTORISTAS PROFISSIONAIS',
    ]);
  });

  it('keeps each penalty line on its own line', () => {
    expect(byLabel('art. 165')[0].text.split('\n')).toEqual(
      expect.arrayContaining(['Infração - gravíssima;', expect.stringMatching(/^Penalidade - multa \(dez vezes\)/)])
    );
  });

  it('drops a superseded § or inciso printed right before its current wording', () => {
    const text = [
      'Art. 162. Dirigir veículo:',
      'I - sem possuir Carteira Nacional de Habilitação;',
      'V - com validade da Carteira Nacional de Habilitação vencida há mais de trinta dias:',
      'V - com Carteira Nacional de Habilitação cassada ou com suspensão do direito de dirigir:',
      '§ 1º Texto antigo do parágrafo.',
      'I - inciso antigo do parágrafo;',
      '§ 1º Texto atual do parágrafo.',
    ].join('\n\n');
    const texto = chunkText(text).map((c) => c.text).join('\n');
    expect(texto).not.toContain('vencida há mais de trinta dias');
    expect(texto).toContain('cassada ou com suspensão');
    expect(texto).not.toContain('Texto antigo');
    expect(texto).not.toContain('inciso antigo');
    expect(texto).toContain('Texto atual do parágrafo.');
  });
});

describe('chunkText — long articles', () => {
  const incisos = Array.from({ length: 20 }, (_v, i) => {
    const romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'][i];
    return `${romano} - em local e horário proibidos especificamente pela sinalização, situação número ${i + 1} descrita no dispositivo com detalhes suficientes para ocupar espaço;`;
  });
  const art181 = ['Art. 181. Estacionar o veículo:', ...incisos, 'Infração - média;', 'Penalidade - multa;'].join('\n');
  const chunks = chunkText(art181, 600);

  it('splits at inciso boundaries and says where each continuation starts', () => {
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].numero_dispositivo).toBe('art. 181');
    for (const chunk of chunks.slice(1)) {
      const inciso = /^([IVX]+) -/.exec(chunk.text)?.[1];
      if (inciso) expect(chunk.numero_dispositivo).toBe(`art. 181 ${inciso}`);
    }
    // The excerpt holding inciso XVII is labeled by the inciso it starts at.
    const comXvii = chunks.find((c) => c.text.includes('XVII -'));
    expect(comXvii?.numero_dispositivo).toMatch(/^art\. 181 X[IV]*$/);
  });

  it('never goes past the size limit', () => {
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(600);
  });

  it('splits an oversized paragraph at sentences without breaking "art." or "nº"', () => {
    const frases = Array.from(
      { length: 12 },
      (_v, i) => `Conforme o art. ${100 + i} da Lei nº 9.503, de 1997, o agente deve registrar a ocorrência número ${i}.`
    ).join(' ');
    const partes = chunkText(`Art. 5º ${frases}`, 300);
    for (const parte of partes) {
      expect(parte.text).not.toMatch(/art\.$/);
      expect(parte.text).not.toMatch(/^\d+ da Lei/);
      expect(parte.text.length).toBeLessThanOrEqual(300);
    }
  });
});

describe('chunkText — text extracted from a PDF', () => {
  it('reflows wrapped lines and does not take a wrapped citation for an article', () => {
    const pdf = [
      pageMarker(1),
      'Art. 280. Ocorrendo infração prevista na legislação de trânsito, lavrar-',
      'se-á auto de infração, do qual constará, observado o disposto no',
      'art. 281, os seguintes dados:',
      'I - tipificação da infração;',
    ].join('\n');
    const [chunk, ...resto] = chunkText(pdf);
    expect(resto).toHaveLength(0);
    expect(chunk.numero_dispositivo).toBe('art. 280');
    expect(chunk.page).toBe(1);
    expect(chunk.text).toBe(
      'Art. 280. Ocorrendo infração prevista na legislação de trânsito, lavrar-se-á auto de infração, do qual constará, observado o disposto no art. 281, os seguintes dados:\nI - tipificação da infração;'
    );
  });

  it('keeps real hyphens (ênclise/mesóclise) and undoes end-of-line hyphenation', () => {
    const [chunk] = chunkText('Art. 162. Permitir que pessoa conduza e passe a conduzi-\nlo na via, sendo a infra-\nção grave.');
    expect(chunk.text).toBe('Art. 162. Permitir que pessoa conduza e passe a conduzi-lo na via, sendo a infração grave.');
  });

  it('does not treat "(VETADO)" as a heading', () => {
    const chunks = chunkText('Art. 7º Compete ao órgão executivo de trânsito fiscalizar.\n\n(VETADO)\n\nArt. 8º Os Estados organizarão os órgãos.');
    expect(chunks.every((c) => c.section === undefined)).toBe(true);
  });
});

describe('chunkText — sections mode (POP)', () => {
  const pop = [
    pageMarker(1),
    'POP 1.01 - ABORDAGEM A PESSOAS',
    '',
    '1. FINALIDADE',
    'Padronizar a abordagem a pessoas em via pública, preservando a segurança da guarnição.',
    '',
    pageMarker(2),
    '3. SEQUÊNCIA DAS AÇÕES',
    '1. Informar à central o local da abordagem.',
    '2. Posicionar a viatura a aproximadamente 5 metros.',
    '3. Verbalizar de forma clara com o abordado.',
    '',
    '3.1 Da busca pessoal',
    'O segurança mantém a cobertura enquanto o executor realiza a busca pessoal.',
    'Art. 244 do CPP autoriza a busca pessoal havendo fundada suspeita.',
  ].join('\n');
  const chunks = chunkText(pop, 1200, 'secoes');

  it('cuts at section headings and names each section with its POP and parent heading', () => {
    expect(chunks.map((c) => c.section)).toEqual([
      'POP 1.01 - ABORDAGEM A PESSOAS › 1. FINALIDADE',
      'POP 1.01 - ABORDAGEM A PESSOAS › 3. SEQUÊNCIA DAS AÇÕES',
      'POP 1.01 - ABORDAGEM A PESSOAS › 3. SEQUÊNCIA DAS AÇÕES › 3.1 Da busca pessoal',
    ]);
  });

  it('records the page each excerpt starts on and hides the page markers', () => {
    expect(chunks.map((c) => c.page)).toEqual([1, 2, 2]);
    expect(chunks.map((c) => c.text).join('')).not.toContain('[[pagina');
  });

  it('keeps numbered steps as list items, not headings', () => {
    expect(chunks[1].text.split('\n')).toEqual([
      '1. Informar à central o local da abordagem.',
      '2. Posicionar a viatura a aproximadamente 5 metros.',
      '3. Verbalizar de forma clara com o abordado.',
    ]);
  });

  it('does not create article labels for citations in a POP', () => {
    expect(chunks.every((c) => c.numero_dispositivo === undefined)).toBe(true);
    expect(chunks[2].text).toContain('Art. 244 do CPP');
  });

  it('uses Markdown headings as sections', () => {
    const md = chunkText('# POP 2.03\n\n## 1. FINALIDADE\n\nPadronizar a fiscalização com etilômetro.', 1200, 'secoes');
    expect(md).toHaveLength(1);
    expect(md[0].section).toBe('POP 2.03 › 1. FINALIDADE');
  });
});
