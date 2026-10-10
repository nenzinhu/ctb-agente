import type { RegraAlias } from './domain-matcher';

export const ALIASES_FATOS_PMSC: readonly RegraAlias[] = [
  {
    termos: ['boca de fumo', 'vendendo droga', 'vendendo drogas', 'vendendo balinha', 'traficando', 'mula do trafico'],
    destinos: ['Tráfico de drogas'],
  },
  {
    termos: ['maconha', 'cocaina', 'cocaína', 'crack', 'po', 'pó', 'baseado'],
    destinos: ['Posse ou porte de drogas para uso pessoal', 'Tráfico de drogas'],
  },
  {
    termos: ['faca', 'facao', 'facão', 'canivete', 'arma branca', 'simulacro', 'triso'],
    destinos: ['Porte ou posse de arma branca ou simulacro'],
  },
  {
    termos: ['som alto', 'som de carro', 'algazarra', 'festa barulhenta', 'pancadao', 'pancadão'],
    destinos: ['Perturbação do trabalho ou sossego alheios'],
  },
  {
    termos: ['bebo na direcao', 'bêbado na direção', 'visivelmente embriagado', 'bafometro', 'bafômetro'],
    destinos: ['Dirigir sob efeito de álcool e/ou droga - embriaguez ao volante'],
  },
  { termos: ['vias de fato', 'briga', 'sair no soco'], destinos: ['Vias de fato'] },
  { termos: ['perdeu os documentos', 'documento perdido', 'extraviou documento'], destinos: ['Perda de documentos ou objetos'] },
];

export const ALIASES_POP: readonly RegraAlias[] = [
  { termos: ['baculejo', 'enquadro', 'revista pessoal', 'busca pessoal'], destinos: ['002'] },
  { termos: ['algema', 'algemas', 'algemado'], destinos: ['003'] },
  { termos: ['blitz', 'barreira policial', 'comando de transito'], destinos: ['105.1.1'] },
  { termos: ['maria da penha', 'violencia domestica'], destinos: ['201.4.6'] },
  { termos: ['batida de carro', 'colisao', 'acidente de transito'], destinos: ['201.6.1'] },
  { termos: ['perseguicao de veiculo', 'acompanhamento de veiculo', 'deu fuga'], destinos: ['006'] },
  { termos: ['cadaver', 'corpo sem vida', 'encontrado morto'], destinos: ['201.4.22'] },
];

export const ALIASES_MBFT: readonly RegraAlias[] = [
  { termos: ['recusa do bafometro', 'nao quis soprar', 'rec bafom'], destinos: ['757-90'] },
  { termos: ['sem cinto'], destinos: ['518-51'] },
  { termos: ['moto sem capacete'], destinos: ['703-01'] },
  { termos: ['garupa sem capacete'], destinos: ['704-81'] },
  { termos: ['segurando celular', 'celular na mao', 'segurando zap'], destinos: ['763-31'] },
  { termos: ['digitando no celular', 'mexendo no celular', 'teclando no celular'], destinos: ['763-32'] },
  { termos: ['vaga pcd'], destinos: ['762-51'] },
  { termos: ['vaga de idoso'], destinos: ['762-52'] },
  { termos: ['racha', 'pega'], destinos: ['524-00'] },
  { termos: ['dar grau', 'empinar moto'], destinos: ['705-61'] },
  { termos: ['estacionar na calcada'], destinos: ['545-21'] },
  { termos: ['retrovisor quebrado'], destinos: ['663-72'] },
  { termos: ['andando no acostamento'], destinos: ['581-97'] },
  { termos: ['ultrapassar pelo acostamento'], destinos: ['590-80'] },
  { termos: ['parou no cruzamento'], destinos: ['563-00'] },
  { termos: ['moto sem placa'], destinos: ['658-00'] },
];
