// Instant "did you mean?" for the consultation field: slang, initials and
// everyday words → the group of related MBFT infractions the person most
// likely means, with a plain-language example. Pure data, no network: it runs
// in the browser while the agent types. Every code is checked against
// data/acervo/mbft-fichas.json by tests/unit/intencoes.test.ts.

export interface OpcaoIntencao {
  codigo: string;
  rotulo: string;
  /** Words that point at this conduct specifically (normalized text) */
  gatilho?: RegExp;
}

export interface Intencao {
  id: string;
  titulo: string;
  /** For someone outside the field — a 12-year-old should get it. */
  exemplo: string;
  gatilhos: RegExp;
  opcoes: OpcaoIntencao[];
}

export const INTENCOES: Intencao[] = [
  {
    id: 'alcool',
    titulo: 'Álcool ou droga ao volante',
    exemplo:
      'Tomou cerveja e foi dirigir? É infração gravíssima. Se o motorista não quiser soprar o bafômetro, também é infração, mesmo sem provar que bebeu.',
    gatilhos:
      /\b(bafometro|etilometro|bebad[oa]s?|embriagad[oa]s?|alcool\w*|bebida|bebeu|beber|manguaca|cachaca|pinga|birita|cerveja|breja|chapad[oa]s?|drogad[oa]s?|maconha|cocaina|droga)\b/,
    opcoes: [
      { codigo: '516-91', rotulo: 'Dirigiu depois de beber', gatilho: /\b(bebe\w*|bebad|embriag|alcool\w*|cerveja|breja|cachaca|pinga|birita|manguaca|cana)\w*/ },
      { codigo: '757-90', rotulo: 'Recusou o bafômetro', gatilho: /\b(recus\w*|nao quis|negou|se negou)\b/ },
      { codigo: '516-92', rotulo: 'Dirigiu sob efeito de droga', gatilho: /\b(chapad|drogad|maconha|cocaina|droga)\w*/ },
    ],
  },
  {
    id: 'habilitacao',
    titulo: 'Carteira de motorista (CNH)',
    exemplo:
      'Dirigir sem ter tirado a carteira é como jogar num campeonato sem estar inscrito. Quem empresta o carro para essa pessoa também leva multa.',
    gatilhos:
      /\b(cnh|ppd|acc|habilitacao|habilitad[oa]|inabilitad[oa]s?|sem carteira|carteira de motorista|carteira vencida|cnh vencida|menor de idade|de menor)\b/,
    opcoes: [
      { codigo: '501-00', rotulo: 'Dirigiu sem CNH', gatilho: /\b(sem (cnh|carteira|habilitacao)|inabilitad\w*|nao (tem|possui) (cnh|carteira|habilitacao)|de menor|menor de idade)\b/ },
      { codigo: '504-50', rotulo: 'CNH vencida há mais de 30 dias', gatilho: /\bvencid\w*/ },
      { codigo: '506-10', rotulo: 'Entregou o carro a quem não tem CNH', gatilho: /\b(entreg|emprest)\w*/ },
    ],
  },
  {
    id: 'celular',
    titulo: 'Celular ao volante',
    exemplo:
      'Segurar o celular na mão enquanto dirige é gravíssimo. Falar com ele apoiado no ombro, sem segurar, é média. Com o carro estacionado, pode usar.',
    gatilhos: /\b(celular|zap|zapzap|whatsapp|smartphone|telefone|mensagem|fone)\b/,
    opcoes: [
      { codigo: '763-31', rotulo: 'Segurando o celular', gatilho: /\b(segur\w*|na mao)\b/ },
      { codigo: '763-32', rotulo: 'Mexendo/digitando no celular', gatilho: /\b(mexend\w*|manuse\w*|digit\w*|mensagem|zap|zapzap|whatsapp|teclando)\b/ },
      { codigo: '736-62', rotulo: 'Usando o celular (sem segurar)', gatilho: /\b(ombro|apoiad\w*|sem segurar|falando)\b/ },
    ],
  },
  {
    id: 'racha',
    titulo: 'Racha e manobras perigosas',
    exemplo:
      'Racha é apostar corrida na rua. Empinar a moto ("dar grau") é andar numa roda só. Os dois colocam quem está em volta em perigo.',
    gatilhos: /\b(racha|rachando|pega|corrida|grau|empin\w*|cavalo de pau|zerinho|cantar pneu|manobra radical)\b/,
    opcoes: [
      { codigo: '524-00', rotulo: 'Disputar corrida (racha)', gatilho: /\b(racha\w*|pega|corrida)\b/ },
      { codigo: '526-63', rotulo: 'Exibição de manobra perigosa', gatilho: /\b(cavalo de pau|zerinho|cantar pneu|manobra\w*)\b/ },
      { codigo: '705-61', rotulo: 'Moto empinando ("grau")', gatilho: /\b(grau|empin\w*|uma roda)\b/ },
    ],
  },
  {
    id: 'sinal-vermelho',
    titulo: 'Sinal vermelho / parada obrigatória',
    exemplo: 'O semáforo vermelho é um "pare" obrigatório. Passar direto, mesmo com a rua vazia, é infração gravíssima.',
    gatilhos:
      /\b(farol|sinal|sinaleiro|semaforo) (vermelho|fechado)\b|\bfur(ar|ou|ando) o (farol|sinal|sinaleiro)\b|\bavan(car|cou|cando) o (sinal|farol)\b|\bplaca de pare\b/,
    opcoes: [
      { codigo: '605-01', rotulo: 'Avançou o sinal vermelho', gatilho: /\b(vermelho|fechado|semaforo|sinaleiro)\b/ },
      { codigo: '605-02', rotulo: 'Não parou na placa PARE', gatilho: /\b(pare|parada obrigatoria)\b/ },
    ],
  },
  {
    id: 'estacionamento',
    titulo: 'Estacionar em lugar proibido',
    exemplo:
      'Parar o carro na calçada obriga quem anda a pé a ir para a rua. Vaga de idoso ou de pessoa com deficiência sem credencial é gravíssimo.',
    gatilhos: /\b(calcada|passeio|fila dupla|vaga de (idos[oa]s?|deficiente|pcd)|estacion\w*|parad[oa] em cima)\b/,
    opcoes: [
      { codigo: '545-21', rotulo: 'Na calçada', gatilho: /\b(calcada|passeio)\b/ },
      { codigo: '548-70', rotulo: 'Em fila dupla', gatilho: /\bfila dupla\b/ },
      { codigo: '762-52', rotulo: 'Vaga de idoso sem credencial', gatilho: /\bidos[oa]s?\b/ },
      { codigo: '762-51', rotulo: 'Vaga de PcD sem credencial', gatilho: /\b(deficien\w*|pcd|cadeirante)\b/ },
    ],
  },
  {
    id: 'velocidade',
    titulo: 'Excesso de velocidade',
    exemplo:
      'A placa diz 60 km/h e o carro passou a 70? Até 20% acima é média. Mais de 50% acima (a 91 ou mais nessa via) já é gravíssimo.',
    gatilhos: /\b(correndo|velocidade|radar|acima do limite|alta velocidade|a mil)\b/,
    opcoes: [
      { codigo: '745-50', rotulo: 'Até 20% acima do limite' },
      { codigo: '746-30', rotulo: 'De 20% a 50% acima' },
      { codigo: '747-10', rotulo: 'Mais de 50% acima' },
    ],
  },
  {
    id: 'cinto',
    titulo: 'Cinto e cadeirinha',
    exemplo:
      'O cinto segura o corpo numa freada. Criança pequena precisa de cadeirinha, porque o cinto de adulto não serve no tamanho dela.',
    gatilhos: /\b(cinto|cadeirinhas?|bebe conforto|assento de elevacao|crianca solta)\b/,
    opcoes: [
      { codigo: '518-51', rotulo: 'Motorista sem cinto', gatilho: /\b(motorista|condutor)\b/ },
      { codigo: '518-52', rotulo: 'Passageiro sem cinto', gatilho: /\b(passageir\w*|carona)\b/ },
      { codigo: '519-30', rotulo: 'Criança sem cadeirinha', gatilho: /\b(crianc\w*|cadeirinh\w*|bebe)\b/ },
    ],
  },
  {
    id: 'capacete',
    titulo: 'Moto: capacete e garupa',
    exemplo: 'Na moto, capacete é obrigatório para quem pilota e para quem vai na garupa.',
    gatilhos: /\b(capacete|garupa)\b/,
    opcoes: [
      { codigo: '703-01', rotulo: 'Piloto sem capacete', gatilho: /\b(piloto|condutor|motociclista|motoqueiro)\b/ },
      { codigo: '704-81', rotulo: 'Garupa sem capacete', gatilho: /\b(garupa|passageir\w*|carona)\b/ },
    ],
  },
  {
    id: 'pelicula',
    titulo: 'Película / vidro escuro',
    exemplo: 'Vidro escuro demais impede ver quem está dentro do carro e atrapalha o motorista à noite.',
    gatilhos: /\b(pelicula|insulfilm|insufilm|fume|vidro escuro)\b/,
    opcoes: [{ codigo: '670-00', rotulo: 'Película fora do permitido' }],
  },
  {
    id: 'documentos',
    titulo: 'Placa e documento do veículo',
    exemplo: 'Todo carro precisa de placa e de licenciamento em dia, como uma "identidade" do veículo renovada todo ano.',
    gatilhos: /\b(sem placas?|placa|licenciamento|licenciad[oa]|ipva|crlv|documento do (carro|veiculo)|documento atrasado)\b/,
    opcoes: [
      { codigo: '659-92', rotulo: 'Licenciamento atrasado', gatilho: /\b(licenc\w*|ipva|crlv|atrasad\w*|vencid\w*)\b/ },
      { codigo: '658-00', rotulo: 'Sem placa', gatilho: /\bsem placas?\b/ },
      { codigo: '691-20', rotulo: 'Sem documento de porte obrigatório', gatilho: /\b(documento|sem (o )?documento)\b/ },
    ],
  },
];

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Infraction groups the text most likely refers to, best first (at most 2).
 * @param texto - What the agent typed so far
 */
export function detectarIntencoes(texto: string, limite = 2): Intencao[] {
  const t = normalizar(texto.trim());
  // A code or an article already goes straight to the right sheet
  if (t.length < 3 || /\b\d{3}\s?-?\s?\d{2}\b|\bart(igo)?\.?\s*\d/.test(t)) return [];
  return INTENCOES.map((intencao) => ({ intencao, posicao: t.search(intencao.gatilhos) }))
    .filter((x) => x.posicao >= 0)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, limite)
    .map((x) => x.intencao);
}

/**
 * The exact conducts the text describes, from the verified map: inside each
 * matched group, the options whose own words appear; the whole group when the
 * text is generic ("estacionado", "celular"). Codes and articles return [].
 * @param texto - The agent's description of the situation
 */
export function condutasCirurgicas(texto: string): string[] {
  const t = normalizar(texto.trim());
  const codigos: string[] = [];
  for (const intencao of detectarIntencoes(texto, INTENCOES.length)) {
    const especificas = intencao.opcoes.filter((o) => o.gatilho?.test(t));
    for (const o of especificas.length ? especificas : intencao.opcoes) {
      if (!codigos.includes(o.codigo)) codigos.push(o.codigo);
    }
  }
  return codigos;
}
