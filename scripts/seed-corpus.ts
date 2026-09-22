// Starter corpus seed.
//
// ⚠️  The rows below are SAMPLE DATA to bootstrap a fresh database.
// Codes, values and fine amounts must be reviewed against the current MBFT
// table and the CTB before any real use.
//
// Run with: npm run seed
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local (ou no ambiente) antes de rodar o seed.'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

interface SeedDispositivo {
  numero_dispositivo: string;
  texto: string;
  norma_id: string;
  tipo: 'lei' | 'resolucao' | 'portaria' | 'manual';
  data_publicacao: string;
  data_vigencia_inicio: string;
  data_vigencia_fim: null;
  citacoes_dentro: string[];
}

const DISPOSITIVOS: SeedDispositivo[] = [
  {
    numero_dispositivo: 'art. 165',
    texto:
      'Art. 165. Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência: Infração - gravíssima; Penalidade - multa (dez vezes) e suspensão do direito de dirigir por 12 (doze) meses; Medida administrativa - recolhimento do documento de habilitação e retenção do veículo, até a apresentação de condutor habilitado.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: ['art. 277', 'Res. CONTRAN 432/2013'],
  },
  {
    numero_dispositivo: 'art. 181 XVII',
    texto:
      'Art. 181. Estacionar o veículo: XVII - em desacordo com as condições regulamentadas especificamente pela sinalização (placa - Estacionamento Regulamentado): Infração - grave; Penalidade - multa; Medida administrativa - remoção do veículo.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: ['art. 270'],
  },
  {
    numero_dispositivo: 'art. 181 XX',
    texto:
      'Art. 181. Estacionar o veículo: XX - nas vagas reservadas às pessoas com deficiência ou idosos, sem credencial que comprove tal condição: Infração - gravíssima; Penalidade - multa; Medida administrativa - remoção do veículo.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: [],
  },
  {
    numero_dispositivo: 'art. 218',
    texto:
      'Art. 218. Transitar em velocidade superior à máxima permitida para o local, medida por instrumento ou equipamento hábil: I - quando a velocidade for superior à máxima em até 20%: Infração - média; II - em mais de 20% até 50%: Infração - grave; III - em mais de 50%: Infração - gravíssima, com suspensão do direito de dirigir.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: ['art. 280', 'Res. CONTRAN 396/2011'],
  },
  {
    numero_dispositivo: 'art. 230',
    texto:
      'Art. 230. Conduzir o veículo: V - que não esteja registrado e devidamente licenciado: Infração - gravíssima; Penalidade - multa e apreensão do veículo; Medida administrativa - remoção do veículo.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: ['art. 271'],
  },
  {
    numero_dispositivo: 'art. 244',
    texto:
      'Art. 244. Conduzir motocicleta, motoneta ou ciclomotor: I - sem usar capacete de segurança com viseira ou óculos de proteção; II - transportando passageiro sem o capacete; III - com farol apagado; Infração - gravíssima; Penalidade - multa e suspensão do direito de dirigir.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: [],
  },
  {
    numero_dispositivo: 'art. 105',
    texto:
      'Art. 105. São equipamentos obrigatórios dos veículos, entre outros a serem estabelecidos pelo CONTRAN: I - cinto de segurança; II - espelhos retrovisores; III - faróis; IV - lanternas; V - pneus em condições de segurança.',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: '1997-09-23',
    data_vigencia_inicio: '1997-09-23',
    data_vigencia_fim: null,
    citacoes_dentro: [],
  },
];

// valor_multa is stored in CENTS (29347 = R$ 293,47)
const ENQUADRAMENTOS = [
  {
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em vaga reservada a idoso ou pessoa com deficiência sem credencial',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: null,
    amparo_legal: 'art. 181 XX do CTB',
    medida_administrativa: 'Remoção do veículo',
    responsavel: 'proprietario',
  },
  {
    codigo_mbft: '517-32',
    desdobramento: 0,
    descricao: 'Conduzir motocicleta com guidom acima da altura do ombro do condutor',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 17056,
    unidade: 'UIRF',
    retem_veiculo: true,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 230 V do CTB',
    medida_administrativa: 'Retenção e remoção do veículo',
    responsavel: 'condutor',
  },
  {
    codigo_mbft: '745-52',
    desdobramento: 1,
    descricao: 'Transitar em velocidade superior à máxima permitida em mais de 20% até 50%',
    gravidade: 'grave',
    pontos: 5,
    valor_multa: 19523,
    unidade: 'UIRF',
    retem_veiculo: false,
    remove_veiculo: false,
    recolhe_documento: null,
    amparo_legal: 'art. 218 II do CTB',
    medida_administrativa: 'Nenhuma',
    responsavel: 'condutor',
  },
  {
    codigo_mbft: '737-19',
    desdobramento: 0,
    descricao: 'Dirigir sob a influência de álcool ou substância psicoativa',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 293470,
    unidade: 'UIRF',
    retem_veiculo: true,
    remove_veiculo: false,
    recolhe_documento: 'cnh',
    amparo_legal: 'art. 165 do CTB',
    medida_administrativa:
      'Recolhimento do documento de habilitação e retenção do veículo até apresentação de condutor habilitado',
    responsavel: 'condutor',
  },
  {
    codigo_mbft: '678-12',
    desdobramento: 0,
    descricao: 'Conduzir veículo não registrado e não licenciado',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 230 V do CTB',
    medida_administrativa: 'Apreensão e remoção do veículo',
    responsavel: 'proprietario',
  },
];

const JURISPRUDENCIA = [
  {
    tipo: 'stj',
    numero: 'REsp 1.111.111/SP (exemplo)',
    ementa:
      'A autuação por estacionamento em vaga reservada exige a descrição da inexistência de credencial, sob pena de nulidade do auto.',
    resumo:
      'Exemplo de decisão cadastrada pela base: a descrição da conduta é requisito de validade do AIT.',
    data_decisao: '2023-05-10',
    tema: 'estacionamento vaga reservada',
    dispositivos_relacionados: ['art. 181'],
    link_oficial: 'https://scon.stj.jus.br/SCON/',
  },
  {
    tipo: 'cetran',
    numero: 'CETRAN-SP 42/2022 (exemplo)',
    ementa:
      'A aferição de velocidade deve indicar o equipamento e a aferição do INMETRO vigente para o período.',
    resumo: 'Exemplo de decisão sobre aferição de velocidade.',
    data_decisao: '2022-08-19',
    tema: 'velocidade aferição de equipamento',
    dispositivos_relacionados: ['art. 218'],
    link_oficial: 'https://www.gov.br/transportes/',
  },
];

/**
 * Insert the sample corpus, replacing rows with the same key
 */
async function seed(): Promise<void> {
  console.log('⚠️  Populando a base com DADOS DE EXEMPLO. Revise códigos e valores antes de usar.');

  const { error: erroDispositivos } = await supabase
    .from('dispositivos')
    .upsert(DISPOSITIVOS, { onConflict: 'numero_dispositivo' });

  if (erroDispositivos) {
    console.error('❌ Falha ao inserir dispositivos:', erroDispositivos.message);
    process.exit(1);
  }
  console.log(`✅ ${DISPOSITIVOS.length} dispositivos inseridos/atualizados.`);

  const { error: erroEnquadramentos } = await supabase
    .from('enquadramentos')
    .upsert(ENQUADRAMENTOS, { onConflict: 'codigo_mbft' });

  if (erroEnquadramentos) {
    console.error('❌ Falha ao inserir enquadramentos:', erroEnquadramentos.message);
    process.exit(1);
  }
  console.log(`✅ ${ENQUADRAMENTOS.length} enquadramentos inseridos/atualizados.`);

  const { error: erroJurisprudencia } = await supabase
    .from('jurisprudencia')
    .upsert(JURISPRUDENCIA, { onConflict: 'numero' });

  if (erroJurisprudencia) {
    console.error('❌ Falha ao inserir jurisprudência:', erroJurisprudencia.message);
    process.exit(1);
  }
  console.log(`✅ ${JURISPRUDENCIA.length} decisões inseridas/atualizadas.`);

  const { error: erroConfig } = await supabase
    .from('configuracoes')
    .upsert(
      { chave: 'app', valor: { consultas_por_hora: 30, turnstile_ativo: true } },
      { onConflict: 'chave' }
    );

  if (erroConfig) {
    console.warn(
      '⚠️  configuracoes não atualizada (migration-002 aplicada?):',
      erroConfig.message
    );
  }

  console.log('🎉 Seed concluído.');
}

seed().catch((error) => {
  console.error('❌ Seed falhou:', error);
  process.exit(1);
});
