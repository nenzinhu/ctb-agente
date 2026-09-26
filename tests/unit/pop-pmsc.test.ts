import { ehManualPop, normalizarManualPop } from '@/lib/ingestion/pop-pmsc';
import { chunkText } from '@/lib/ingestion/chunker';
import { removeRunningHeaders } from '@/lib/ingestion/pdf-text';

// Synthetic pages in the layout of the PMSC's compiled POP manual.
const ASSINATURA =
  'Para verificar a autenticidade desta cópia impressa, acesse o site https://exemplo e informe o processo 1/2020 e o código X1.O original deste documento é eletrônico e foi assinado por FULANO em 01/01/2020.';

const MANUAL = [
  'S A N TA C ATA R I N A',
  'MANUAL DE PADRONIZAÇÃO DE PROCEDIMENTOS OPERACIONAIS',
  '[[pagina:1]]',
  'PROCEDIMENTO OPERACIONAL PADRÃO',
  'BUSCA PESSOAL (TÉCNICA POLICIAL) POP',
  '002',
  'Estabelecido em',
  '23/12/2011',
  'Atualizado em',
  '27/03/2018',
  'Execução',
  'Guarnição PM',
  'MATERIAL NECESSÁRIO',
  '',
  '1. Fardamento, armamento e equipamento (POP 001);',
  '',
  'FUNDAMENTAÇÃO LEGAL E DOUTRINÁRIA',
  'LEGISLAÇÃO/DOUTRINA ESPECIFICAÇÃO',
  'Manual de Técnicas de Polícia Ostensiva - PMSC',
  'Capítulo III (item 5)',
  'SEQUÊNCIA DAS AÇÕES',
  '',
  '1. Identificar cidadão em situação de fundada suspeita;',
  '2. Proceder à busca pessoal;',
  'a. Se a busca é realizada com o suspeito em pé e apoiado:',
  'I. Posicionar o cidadão de costas para o policial;',
  'ii. Colocar a arma no coldre.',
  `3. Registrar a busca no BO.${ASSINATURA}`,
  '',
  '[[pagina:2]]',
  'PROCEDIMENTO OPERACIONAL PADRÃO',
  'BUSCA PESSOAL (TÉCNICA POLICIAL) POP',
  '002',
  'Estabelecido em',
  '23/12/2011',
  'Atualizado em',
  '27/03/2018',
  'Execução',
  'Guarnição PM',
  '4. Todas as GUARNIÇÕES DEVERÃO REALIZAR',
  'O CADASTRO NA CENTRAL ANTES DA BUSCA.',
  'ERROS A SEREM EVITADOS',
  '1. Revistar sem motivo.Manual de POP PMSC Compilado gerado em 25/09/2026 15:02',
  ASSINATURA,
  '',
  '[[pagina:3]]',
  'PROCEDIMENTO OPERACIONAL PADRÃO',
  'OPERAÇÕES COM AERONAVES REMOTAMENTE',
  'PILOTADAS – DRONES POP nº',
  '101.6.5Estabelecido em',
  '24/01/2020',
  'Atualizado em',
  '-',
  'Execução',
  'Guarnição PM',
  'SEQUÊNCIA DAS AÇÕES',
  '1. Checar a bateria do drone.',
].join('\n');

describe('normalizarManualPop', () => {
  it('leaves any other document untouched', () => {
    const texto = 'SEQUÊNCIA DAS AÇÕES\n1. Fazer algo.';
    expect(ehManualPop(texto)).toBe(false);
    expect(normalizarManualPop(texto)).toBe(texto);
  });

  it('turns the first header box of each POP into one numbered heading', () => {
    const texto = normalizarManualPop(MANUAL);

    expect(texto.match(/^POP .*$/gm)).toEqual([
      'POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL)',
      'POP 101.6.5 — OPERAÇÕES COM AERONAVES REMOTAMENTE PILOTADAS – DRONES',
    ]);
  });

  it('drops the repeated boxes, the cover and the signature notices', () => {
    const texto = normalizarManualPop(MANUAL);

    expect(texto).not.toMatch(/PROCEDIMENTO OPERACIONAL PADRÃO/);
    expect(texto).not.toMatch(/Estabelecido em|Atualizado em|Guarnição PM/);
    expect(texto).not.toMatch(/autenticidade|assinado|Compilado gerado/);
    expect(texto).not.toMatch(/S A N TA|MANUAL DE PADRONIZAÇÃO/);
    expect(texto).not.toMatch(/LEGISLAÇÃO\/DOUTRINA/);
    // Content that shared a line with a notice survives.
    expect(texto).toContain('3. Registrar a busca no BO.');
    expect(texto).toContain('1. Revistar sem motivo.');
    // Page markers stay for the chunker.
    expect(texto).toContain('[[pagina:2]]');
  });

  it('reads the number wherever the box puts it', () => {
    const variantes: [string[], string][] = [
      // After a multi-line executor
      [['ATENDIMENTO DE OBJETOS ENCONTRADOS', '', 'Estabelecido em', '23/12/2011', 'Atualizado em', '03/02/2020', 'Execução', 'Guarnição PM e', '', 'Seção Técnica OPM', '', 'POP', '201.14.1', '', 'MATERIAL NECESSÁRIO'], 'POP 201.14.1 — ATENDIMENTO DE OBJETOS ENCONTRADOS'],
      // After a blank line below the title
      [['DESENVOLVIMENTO PROGRAMA', 'PROTETOR AMBIENTAL', 'POP', '', '102.10.1', 'Estabelecido em', '22/04/2021', 'Atualizado em Execução', 'Educador', 'Ambiental PM', 'FUNDAMENTAÇÃO LEGAL E DOUTRINÁRIA'], 'POP 102.10.1 — DESENVOLVIMENTO PROGRAMA PROTETOR AMBIENTAL'],
      // A long title, "POP" and the number on their own lines
      [['ABORDAGEM, PRISÃO, CONDUÇÃO E', 'HIGIENIZAÇÃO DURANTE PERÍODO DE', 'GRANDE PROPAGAÇÃO DO COVID-19', '(CORONAVÍRUS).', '', 'POP', '008', '', 'Estabelecido em', '20/03/2020', 'MATERIAL NECESSÁRIO'], 'POP 008 — ABORDAGEM, PRISÃO, CONDUÇÃO E HIGIENIZAÇÃO DURANTE PERÍODO DE GRANDE PROPAGAÇÃO DO COVID-19 (CORONAVÍRUS)'],
      // The source's own typo: "Estabelecido em" twice
      [['ENCONTRO DE PESSOA PERDIDA POP', '201.16.1', 'Estabelecido em', '23/12/2011', 'Estabelecido em', '12/04/2019', 'Execução', 'Guarnição PM', 'MATERIAL NECESSÁRIO'], 'POP 201.16.1 — ENCONTRO DE PESSOA PERDIDA'],
    ];

    for (const [caixa, titulo] of variantes) {
      const texto = normalizarManualPop(['PROCEDIMENTO OPERACIONAL PADRÃO', ...caixa, '1. Primeiro passo.'].join('\n'));
      expect(texto.split('\n')[0]).toBe(titulo);
      expect(texto).not.toMatch(/Estabelecido|Execução|Seção Técnica|Educador|Ambiental PM|^\d+(\.\d+)*$/m);
      expect(texto).toContain('1. Primeiro passo.');
    }
  });

  it('keeps a POP whose later pages cut the title shorter or omit the number', () => {
    const texto = normalizarManualPop(
      [
        'PROCEDIMENTO OPERACIONAL PADRÃO',
        'INFRAÇÕES NA COMERCIALIZAÇÃO DE CERVEJAS NOS',
        'ESTÁDIOS E ARENAS DESPORTIVAS',
        '',
        'POP',
        '103.10.1',
        '',
        'Estabelecido em',
        '25/11/2021',
        'OBJETIVO',
        'Processar as infrações.',
        '[[pagina:9]]',
        'PROCEDIMENTO OPERACIONAL PADRÃO',
        '',
        'INFRAÇÕES NA COMERCIALIZAÇÃO DE CERVEJAS NOS ESTÁDIOS E ARENAS',
        'Estabelecido em',
        '25/10/2021',
        '2. Lavrar o auto.',
      ].join('\n')
    );

    expect(texto.match(/^POP .*$/gm)).toEqual(['POP 103.10.1 — INFRAÇÕES NA COMERCIALIZAÇÃO DE CERVEJAS NOS ESTÁDIOS E ARENAS DESPORTIVAS']);
    expect(texto).toContain('2. Lavrar o auto.');
  });
});

describe('chunkText on the POP manual', () => {
  const trechos = chunkText(normalizarManualPop(MANUAL), undefined, 'secoes');

  it('labels every excerpt with its POP and section', () => {
    expect(trechos.map((t) => t.section)).toEqual(
      expect.arrayContaining([
        'POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL) › MATERIAL NECESSÁRIO',
        'POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL) › SEQUÊNCIA DAS AÇÕES',
        'POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL) › ERROS A SEREM EVITADOS',
        'POP 101.6.5 — OPERAÇÕES COM AERONAVES REMOTAMENTE PILOTADAS – DRONES › SEQUÊNCIA DAS AÇÕES',
      ])
    );
    expect(trechos.every((t) => t.section?.startsWith('POP '))).toBe(true);
  });

  it('keeps procedure lists one step per line', () => {
    const sequencia = trechos.find((t) => t.section?.endsWith('SEQUÊNCIA DAS AÇÕES') && t.text.includes('a. Se a busca'));
    expect(sequencia?.text).toContain('\na. Se a busca é realizada com o suspeito em pé e apoiado:\nI. Posicionar');
    expect(sequencia?.text).toContain('\nii. Colocar a arma no coldre.');
  });

  it('does not mistake a sentence in capitals or a cited chapter for a heading', () => {
    const texto = trechos.map((t) => t.text).join('\n');
    expect(texto).toContain('4. Todas as GUARNIÇÕES DEVERÃO REALIZAR O CADASTRO NA CENTRAL ANTES DA BUSCA.');
    expect(texto).toContain('Manual de Técnicas de Polícia Ostensiva - PMSC Capítulo III (item 5)');
  });
});

describe('removeRunningHeaders with POP header boxes', () => {
  const caixa = (titulo: string, numero: string) => ['PROCEDIMENTO OPERACIONAL PADRÃO', `${titulo} POP`, numero];

  it('keeps the POP number below "POP" in a manual, but still drops page numbers', () => {
    const paginas = [
      [...caixa('BUSCA PESSOAL', '002'), 'Passo da busca.', '1'],
      [...caixa('BUSCA PESSOAL', '002'), 'Outro passo da busca.', '2'],
      [...caixa('USO DE ALGEMA', '003'), 'Passo da algema.', '3'],
      [...caixa('ESCOLTA', '101.11.1'), 'Passo da escolta.', '4'],
      [...caixa('BARREIRA POLICIAL', '105.1.1'), 'Passo da barreira.', '5'],
      [...caixa('PATRULHA URBANA', '105.6.1'), 'Passo da patrulha.', '6'],
    ].map((linhas) => linhas.join('\n'));

    const limpas = removeRunningHeaders(paginas).map((pagina) => pagina.split('\n'));

    expect(limpas[0]).toContain('002');
    expect(limpas[2]).toContain('003');
    limpas.forEach((linhas, i) => expect(linhas).not.toContain(String(i + 1)));
  });

  it('drops the number with the box when a single POP repeats it on every page', () => {
    const passos = ['Identificar o suspeito.', 'Verbalizar com clareza.', 'Realizar a busca.', 'Registrar no BO.'];
    const paginas = passos.map((passo, i) => [...caixa('BUSCA PESSOAL', '002'), passo, String(i + 1)].join('\n'));

    expect(removeRunningHeaders(paginas)).toEqual(passos);
  });
});
