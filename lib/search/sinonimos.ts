// Vocabulary maps retrieval concepts to words present in the manuals. These
// are search alternatives, never legal conclusions or invented infractions.
// Patterns use lowercase Portuguese without accents.
export const SINONIMOS: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/\bmotos?\b/, ['motocicleta', 'motoneta', 'ciclomotor']],
  [/\bcarros?\b/, ['automóvel', 'veículo']],
  [/\bbaf(?:ometro|omet|om|o)?\b/, ['etilômetro', 'alcoolemia', 'álcool']],
  [/\b(?:bebad[oa]s?|embriag(?:ad[oa]s?)?|alcoolizad[oa]s?|bebida)\b/, ['influência de álcool']],
  [/\b(?:chapad[oa]s?|drogad[oa]s?)\b/, ['substância psicoativa']],
  [/\bcnh\b|\bcarteira de motorista\b/, ['Carteira Nacional de Habilitação']],
  [/\bsem carteira\b|\binabilitad[oa]s?\b|\bsem habilitacao\b/, ['sem possuir Carteira Nacional de Habilitação']],
  [/\bdocumento do (?:carro|veiculo)\b/, ['Certificado de Licenciamento', 'CRLV', 'licenciamento']],
  [/\b(?:celular|zap|whatsapp|telefone)\b/, ['telefone celular']],
  [/\bguincho\b|\brebocad[oa]\b/, ['remoção do veículo']],
  [/\bracha\b|\bpega\b/, ['disputa de corrida', 'competição']],
  [/\bcontramao\b/, ['sentido contrário']],
  [/\bfaixa de pedestres?\b/, ['faixa de pedestres', 'travessia']],
  [/\b(?:correndo|alta velocidade|excesso de velocidade)\b/, ['velocidade superior à máxima permitida']],
  [/\bvaga de idos[oa]s?\b/, ['vaga reservada idoso']],
  [/\bvaga (?:de )?(?:deficiente|pcd)\b/, ['vaga reservada pessoa com deficiência']],
  [/\b(?:insulfilm|insulfim|pelicula)\b/, ['película vidros']],
  [/\bsom alto\b|\bpancadao\b/, ['som volume audível', 'perturbação sossego']],
  [/\bmenor de idade\b/, ['menor de dezoito anos']],
  [/\bcapacete\b/, ['capacete de segurança']],
  [/\bcadeirinhas?\b|\bbebe conforto\b|\bassento de elevacao\b/, ['dispositivo de retenção', 'crianças normas de segurança']],
  [/\bfarol\b|\bfarois\b/, ['luz baixa', 'faróis']],
  [/\bfila dupla\b/, ['ao lado de outro veículo em fila dupla']],
  [/\b(?:recusa|recusou|recusar|nao quis soprar)\b/, ['recusar', 'recusou', 'recusa']],
  [/\brec\b(?=\.?\s+(?:do\s+)?baf)/, ['recusar', 'recusa']],
  [/\bbusc(?:a)?\s+pess\b/, ['busca pessoal']],
  [/\bcond\b/, ['condutor', 'dirigir']],
  [/\b(?:dar grau|empinar|empinando|grau)\b/, ['equilibrando uma roda', 'malabarismo']],
  [/\b(?:pneu careca|pneus carecas)\b/, ['pneu desgaste', 'mau estado de conservação']],
  [/\b(?:escapamento aberto|escape aberto|descarga livre)\b/, ['descarga livre', 'silenciador defeituoso']],
  [/\b(?:blitz)\b/, ['barreira policial', 'comando de trânsito']],
  [/\b(?:baculejo|enquadro|revista pessoal)\b/, ['busca pessoal', 'abordagem policial']],
  [/\b(?:maria da penha)\b/, ['violência doméstica']],
  [/\b(?:perseguicao|fuga de veiculo)\b/, ['perseguição de veículo', 'acompanhamento de veículo']],
  [/\b(?:batida de carro|colisao|abalroamento)\b/, ['acidente de trânsito']],
  [/\b(?:na |sobre a )?calcada\b/, ['passeio']],
  [/\b(?:furou|passou|avancou) (?:o )?(?:sinal|vermelho)\b/, ['avançar sinal vermelho semáforo']],
  [/\b(?:deu|dar|passou sem dar) seta\b|\bsem seta\b|\bpisca\b/, ['luz indicadora gesto de braço']],
  [/\b(?:doc|documento|licenciamento) atrasad[oa]\b/, ['veículo não licenciado']],
  [/\b(?:carro|veiculo) rebaixad[oa]\b/, ['característica alterada veículo']],
  [/\b(?:placa escondida|placa tampada|sem placa visivel)\b/, ['placa sem visibilidade legibilidade']],
  [/\b(?:cadaver|corpo sem vida|encontrado morto)\b/, ['encontro de cadáver constatação de óbito']],
  [/\b(?:baseado|maconha|cocaina|crack)\b/, ['posse de drogas para consumo', 'tráfico de drogas']],
  [/\b(?:motoca|motinha)\b/, ['motocicleta']],
  [/\b(?:bike|magrela)\b/, ['bicicleta']],
  [/\b(?:breja|cachaca|pinga)\b/, ['bebida alcoólica', 'influência de álcool']],
  [/\b(?:furou|fugiu da|passou pela) blitz\b/, ['transpor bloqueio policial', 'desobedecer ordem de parada']],
  [/\b(?:farol|lanterna) queimad[oa]\b/, ['defeito no sistema de iluminação']],
  [/\bcrianca solta\b/, ['transportar criança sem observância das normas de segurança']],
  [/\b(?:deu|meteu) fuga\b/, ['acompanhamento perseguição de veículo', 'desobedecer ordem de parada']],
  [/\b(?:mexendo|digitando|teclando|rolando (?:a )?tela)\b/, ['manuseando telefone celular']],
  [/\bcelular (?:na mao|segurado)\b/, ['segurando telefone celular']],
  [/\b(?:garupa|carona) sem capacete\b/, ['passageiro sem capacete de segurança']],
  [/\bsem retrovisor\b/, ['sem equipamento obrigatório']],
  [/\bretrovisor (?:quebrado|solto|inoperante)\b/, ['equipamento obrigatório ineficiente inoperante']],
  [/\b(?:andando|trafegando|rodando) (?:pelo|no) acostamento\b/, ['transitar veículo em acostamentos']],
  [/\b(?:ultrapassou|cortou) pelo acostamento\b/, ['ultrapassar pelo acostamento']],
  [/\b(?:parou|fechou) (?:no|o) cruzamento\b/, ['parar na área de cruzamento de vias']],
  [/\b(?:furou|passou direto) (?:a )?preferencial\b/, ['deixar de dar preferência interseção']],
  [/\b(?:moto|carro|veiculo) sem placa\b/, ['veículo sem placas de identificação']],
];

export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bs\s*\/\s*/g, 'sem ')
    .replace(/\bc\s*\/\s*/g, 'com ');
}

/** Flat expansion is used by the database's OR-based full-text search. */
export function expandirSinonimos(consulta: string): string {
  const normalizada = normalizarBusca(consulta);
  const extras = SINONIMOS.filter(([padrao]) => padrao.test(normalizada)).flatMap(([, termos]) => termos);
  const texto = consulta.replace(/\bs\s*\/\s*/gi, 'sem ').replace(/\bc\s*\/\s*/gi, 'com ');
  return extras.length > 0 ? `${texto} ${extras.join(' ')}` : texto;
}

/** Each matched phrase is ONE concept; synonyms must not multiply its score. */
export function conceitosDaConsulta(consulta: string): { restante: string; alternativas: string[][] } {
  const normalizada = normalizarBusca(consulta);
  const restante = [...normalizada];
  const alternativas: string[][] = [];
  const ocupadas = new Set<number>();
  // Prefer the full expression ("batida de carro") over a word inside it
  // ("carro"). Otherwise expanding the word first erases the actual intent.
  const encontrados = SINONIMOS.flatMap(([padrao, termos]) =>
    [...normalizada.matchAll(new RegExp(padrao.source, 'g'))].map((m) => ({ original: m[0], inicio: m.index!, termos }))
  ).sort((a, b) => b.original.length - a.original.length);
  for (const { original, inicio, termos } of encontrados) {
    const posicoes = Array.from({ length: original.length }, (_, i) => inicio + i);
    if (posicoes.some((i) => ocupadas.has(i))) continue;
    alternativas.push([original, ...termos]);
    for (const i of posicoes) {
      ocupadas.add(i);
      restante[i] = ' ';
    }
  }
  return { restante: restante.join(''), alternativas };
}
