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
  // "Farol vermelho" is the traffic light in much of Brazil, not the headlamp
  [/\b(farol|sinal|sinaleiro|semaforo) (vermelho|fechado)\b|\bfur(ar|ou|ando) o (farol|sinal|sinaleiro)\b/, 'avançar o sinal vermelho do semáforo'],
  [/(?<!fur\w{1,4} o )\b(farol|farois)\b(?! (vermelho|fechado))/, 'luz baixa faróis'],
  [/\bfila dupla\b/, 'ao lado de outro veículo em fila dupla'],
  [/\b(manguaca|cachaca|pinga|birita|cerveja|breja|cana)\b/, 'influência de álcool'],
  [/\b(chapad[oa]s?|drogad[oa]s?|maconha|cocaina|droga)\b/, 'substância psicoativa'],
  [/\b(zap|zapzap|whatsapp|smartphone)\b/, 'telefone celular'],
  [/\b(fume|insufilm)\b/, 'película vidros'],
  [/\b(grau|empin\w*|cavalo de pau|zerinho|manobra radical)\b/, 'malabarismo equilibrando-se apenas em uma roda exibição perícia em manobra'],
  [/\bcalcada\b/, 'passeio'],
  [/\bsem placas?\b/, 'sem qualquer uma das placas de identificação'],
  [/\b(ipva|licenciamento atrasado|documento atrasado|crlv)\b/, 'devidamente licenciado'],
  [/\bppd\b/, 'Permissão para Dirigir'],
  [/\bacc\b/, 'Autorização para Conduzir Ciclomotor'],
  [/\bait\b/, 'auto de infração'],
];

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
