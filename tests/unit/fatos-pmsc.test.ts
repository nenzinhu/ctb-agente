import { lerFatosPmsc, type FragmentoPdf } from '@/lib/fatos-pmsc/parser';
import { buscarFato, buscarFatosPmsc, buscarFatosPmscComScore } from '@/lib/fatos-pmsc/fatos';
import type { FatoPmsc } from '@/lib/fatos-pmsc/parser';

const pagina: FragmentoPdf[] = [
  { x: 20, y: 700, texto: 'Auxílio/Apoio' },
  { x: 126, y: 700, texto: 'Perda de documentos ou objetos' },
  { x: 526, y: 700, texto: 'Atípico' },
  { x: 28, y: 670, texto: 'Contra a pessoa' },
  { x: 126, y: 676, texto: 'Ameaça' },
  { x: 527, y: 676, texto: 'Menor' },
  { x: 509, y: 664, texto: 'Condicionado' },
  { x: 20, y: 640, texto: 'Perturbação' },
  { x: 126, y: 640, texto: 'Perturbação do trabalho ou sossego alheios' },
  { x: 527, y: 640, texto: 'Menor' },
];

const FATOS: FatoPmsc[] = [
  { grupo: 'Auxílio/Apoio', natureza: 'Perda de documentos ou objetos', potencialOfensivo: 'Atípico', pagina: 1, versao: '10/06/2019' },
  { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 23, versao: '10/06/2019' },
  { grupo: 'Outras infrações penais', natureza: 'Vias de fato', potencialOfensivo: 'Menor Condicionado', pagina: 22, versao: '10/06/2019' },
  { grupo: 'Acidente de trânsito', natureza: 'Acidente de trânsito (Apenas danos materiais)', potencialOfensivo: 'Atípico', pagina: 1, versao: '10/06/2019' },
  { grupo: 'Contra a vida', natureza: 'Suicídio', potencialOfensivo: 'Maior', pagina: 6, versao: '10/06/2019' },
  { grupo: 'Contra a vida', natureza: 'Induzimento, instigação ou auxílio a suicídio', potencialOfensivo: 'Maior', pagina: 6, versao: '10/06/2019' },
  { grupo: 'Acidente de trânsito', natureza: 'Acidente de trânsito (Com pessoa ferida ou morta)', potencialOfensivo: 'Atípico', pagina: 1, versao: '10/06/2019' },
  { grupo: 'Crime de trânsito', natureza: 'Lesão corporal culposa em acidente de trânsito', potencialOfensivo: 'Menor Condicionado', pagina: 6, versao: '10/06/2019' },
];

describe('catálogo Lista de Fatos PMSC Mobile', () => {
  it('mantém grupo, natureza e potencial da mesma linha da tabela', () => {
    expect(lerFatosPmsc([{ numero: 3, fragmentos: pagina }])).toEqual([
      { grupo: 'Auxílio/Apoio', natureza: 'Perda de documentos ou objetos', potencialOfensivo: 'Atípico', pagina: 3, versao: '10/06/2019' },
      { grupo: 'Contra a pessoa', natureza: 'Ameaça', potencialOfensivo: 'Menor Condicionado', pagina: 3, versao: '10/06/2019' },
      { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 3, versao: '10/06/2019' },
    ]);
  });

  it.each([
    ['perdeu os docs', 'Perda de documentos ou objetos'],
    ['som alto', 'Perturbação do trabalho ou sossego alheios'],
    ['vias fat', 'Vias de fato'],
    ['acid só dano mater', 'Acidente de trânsito (Apenas danos materiais)'],
  ])('entende linguagem operacional em %s', (consulta, natureza) => {
    expect(buscarFatosPmsc(consulta, 3, FATOS).map((fato) => fato.natureza)).toContain(natureza);
  });

  it('retorna no máximo três registros reais e não inventa resposta sem cobertura', () => {
    expect(buscarFatosPmsc('fato', 3, FATOS)).toEqual([]);
    expect(buscarFatosPmsc('xyzqwerty', 3, FATOS)).toEqual([]);
    expect(buscarFatosPmsc('perdeu docs', 99, FATOS).length).toBeLessThanOrEqual(3);
  });

  it.each(['tentou se matar', 'quer tirar a própria vida', 'tent suic'])('entende tentativa de suicídio em “%s”', (consulta) => {
    expect(buscarFatosPmsc(consulta, 3, FATOS)[0]?.natureza).toBe('Suicídio');
  });

  it('preserva as duas naturezas possíveis quando o acidente deixa pessoa ferida', () => {
    const naturezas = buscarFatosPmsc('bateu o carro e feriu uma pessoa', 3, FATOS).map((fato) => fato.natureza);
    expect(naturezas).toEqual(expect.arrayContaining([
      'Acidente de trânsito (Com pessoa ferida ou morta)',
      'Lesão corporal culposa em acidente de trânsito',
    ]));
  });

  it('retorna confiança e método para gíria, erro e natureza oficial', () => {
    const fatos = [
      ...FATOS,
      { grupo: 'Drogas', natureza: 'Tráfico de drogas', potencialOfensivo: 'Maior', pagina: 25, versao: '10/06/2019' as const },
      { grupo: 'Arma de fogo', natureza: 'Porte ou posse de arma branca ou simulacro', potencialOfensivo: 'Menor', pagina: 2, versao: '10/06/2019' as const },
    ];

    expect(buscarFatosPmscComScore('boca de fumo', 3, fatos)[0]).toMatchObject({
      fato: { natureza: 'Tráfico de drogas' },
      metodoEncontrado: 'giria_exata',
      scoreConfianca: expect.any(Number),
    });
    expect(buscarFatosPmscComScore('porte de arma brnaca', 3, fatos)[0]).toMatchObject({
      fato: { natureza: 'Porte ou posse de arma branca ou simulacro' },
      metodoEncontrado: 'fuzzy_giria',
    });
    expect(buscarFato('xyzqwerty', fatos)).toEqual({
      natureza_oficial: 'Fato não identificado com segurança',
      score_confianca: 0,
      metodo_encontrado: 'nao_identificado',
    });
  });
});
