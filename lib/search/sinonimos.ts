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
