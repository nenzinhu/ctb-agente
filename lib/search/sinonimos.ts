// Field vocabulary → the words the law and the POPs actually use. Word search
// can't know that "moto" is "motocicleta" or "bafômetro" is "etilômetro";
// vectors can, but only when an embedding provider is configured. Applied to
// full-text search only — the embedding gets the question as typed.

// Patterns run on the lowercased question without accents.
const SINONIMOS: [RegExp, string][] = [
  [/\bmotos?\b/, 'motocicleta motoneta ciclomotor'],
  [/\bcarros?\b/, 'automóvel veículo'],
  [/\bbafometro\b/, 'etilômetro alcoolemia álcool'],
  [/\b(bebad[oa]s?|embriagad[oa]s?|alcoolizad[oa]s?|bebida)\b/, 'influência de álcool'],
  [/\bcnh\b|\bcarteira de motorista\b/, 'Carteira Nacional de Habilitação'],
  [/\bsem carteira\b|\binabilitad[oa]s?\b|\bsem habilitacao\b/, 'sem possuir Carteira Nacional de Habilitação'],
  [/\bdocumento do (carro|veiculo)\b/, 'Certificado de Licenciamento CRLV licenciamento'],
  [/\bcelular\b/, 'telefone celular'],
  [/\bguincho\b|\brebocad[oa]\b/, 'remoção do veículo'],
  [/\bracha\b|\bpega\b/, 'disputa de corrida competição'],
  [/\bcontramao\b/, 'sentido contrário'],
  [/\bfaixa de pedestres?\b/, 'faixa de pedestres travessia'],
  [/\b(correndo|alta velocidade|excesso de velocidade)\b/, 'velocidade superior à máxima permitida'],
  [/\bvaga de idos[oa]s?\b/, 'vaga reservada idoso'],
  [/\bvaga de (deficiente|pcd)\b/, 'vaga reservada pessoa com deficiência'],
  [/\b(insulfilm|pelicula)\b/, 'película vidros'],
  [/\bsom alto\b/, 'som volume audível'],
  [/\bmenor de idade\b/, 'menor de dezoito anos'],
  [/\bcapacete\b/, 'capacete de segurança'],
  [/\bcadeirinhas?\b|\bbebe conforto\b|\bassento de elevacao\b/, 'crianças normas de segurança dispositivo de retenção'],
  [/\bfarol\b|\bfarois\b/, 'luz baixa faróis'],
  [/\bfila dupla\b/, 'ao lado de outro veículo em fila dupla'],
  // POP-PMSC: the street word → the POP's own title and terms.
  [/\btaser\b|\barma de choque\b/, 'dispositivo eletrônico de incapacitação'],
  [/\b(spray|gas) de pimenta\b|\bgas lacrimogeneo\b|\bspray\b/, 'espargidor solução lacrimogênea'],
  [/\b(balas?|municao|tiros?) de borracha\b/, 'munição de elastômero'],
  [/\bprotestos?\b|\bpasseatas?\b/, 'manifestação'],
  [/\b(cavalos?|bois?|vacas?|gado|cachorros?|caes|animais?) solt[oa]s?\b|\banimais? na (pista|via|rodovia|estrada)\b/, 'animal em via pública'],
  [/\btransport\w* (de |do |da |o |a |os |as )?(pres[oa]s?|detid[oa]s?)\b/, 'condução de preso em viatura'],
  [/\btermo circunstanciado\b|\btco\b/, 'lavratura de BO-TC'],
  [/\bato infracional\b|\b(adolescente|menor) (infrator|apreendid[oa])\b/, 'ocorrência envolvendo crianças e adolescentes'],
  [/\bassaltos?\b/, 'roubo'],
];

// Words that make a question, not a subject ("quando posso algemar
// alguém"): in a POP they match almost everything and push the one word
// that matters ("algemar") down.
const PALAVRAS_DE_PERGUNTA = new Set([
  'posso', 'pode', 'podem', 'podemos', 'devo', 'deve', 'devem', 'devemos', 'preciso', 'precisa', 'precisam',
  'fazer', 'faco', 'faz', 'proceder', 'procedimento', 'procedimentos', 'alguem', 'algum', 'alguma', 'oque',
  'correto', 'certo', 'forma', 'maneira', 'jeito', 'existe', 'existem',
]);

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * @param consulta - Question as typed
 * @returns The question without its question words, or as typed when
 *   nothing else is left ("como fazer?")
 */
export function semPalavrasDePergunta(consulta: string): string {
  const palavras = consulta.split(/\s+/).filter(Boolean);
  const restantes = palavras.filter((palavra) => !PALAVRAS_DE_PERGUNTA.has(semAcento(palavra.toLowerCase()).replace(/[^\p{L}]/gu, '')));
  return restantes.length > 0 ? restantes.join(' ') : consulta;
}

/**
 * @param consulta - Question as typed (PII already filtered)
 * @returns The question plus the legal wording of the field terms it uses
 */
export function expandirSinonimos(consulta: string): string {
  const normalizada = consulta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const extras = SINONIMOS.filter(([padrao]) => padrao.test(normalizada)).map(([, termos]) => termos);
  return extras.length > 0 ? `${consulta} ${extras.join(' ')}` : consulta;
}
