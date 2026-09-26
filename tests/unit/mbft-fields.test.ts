import { parseMbftFields, extrairMbftFields, listarFichasMbft } from '@/lib/response/mbft-fields';

const TEXTO_MBFT_181_XX = `Art. 181, XX. Tipificação do Enquadramento: Estacionar o veículo nas vagas reservadas às pessoas com deficiência ou idosos, sem credencial que comprove tal condição. Gravidade: Gravíssima
Penalidade: Multa
Medida Administrativa: Remoção do veículo (Vide Parte Geral deste Manual).
Pode Configurar Crime de Trânsito:
NÃOInfrator: Condutor Competência: Órgão ou Entidade de Trânsito Municipal e Rodoviário. Pontuação: 7 Constatação da Infração: Possível sem abordagem.
Quando Autuar: Quando NÃO Autuar: Definições e Procedimentos: Exemplos do Campo de Observações do AIT:
1. Veículo estacionado em vaga sinalizada como de uso exclusivo de idoso (pessoa com idade igual ou maior de 60 anos): 1.1 sem credencial 1.2 com credencial vencida; 1.3 com credencial ilegível.
2. Veículo estacionado em vaga sinalizada como de uso exclusivo de pessoa com deficiência sem o cartão especial: 2.1 sem credencial 2.2 com credencial vencida.`;

const TEXTO_CTB_SIMPLES =
  'Art. 165. Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa: Infração - gravíssima; Penalidade - multa (dez vezes).';

describe('parseMbftFields', () => {
  it('extrai os campos rotulados de um chunk do MBFT', () => {
    const campos = parseMbftFields(TEXTO_MBFT_181_XX);

    expect(campos.tipificacao).toBe(
      'Estacionar o veículo nas vagas reservadas às pessoas com deficiência ou idosos, sem credencial que comprove tal condição.'
    );
    expect(campos.gravidade).toBe('Gravíssima');
    expect(campos.penalidade).toBe('Multa');
    expect(campos.medidaAdministrativa).toBe('Remoção do veículo (Vide Parte Geral deste Manual).');
    expect(campos.configuraCrime).toBe('NÃO');
    expect(campos.infrator).toBe('Condutor');
    expect(campos.constatacao).toBe('Possível sem abordagem.');
  });

  it('limpa a Pontuação que vem colada na Competência', () => {
    const campos = parseMbftFields(TEXTO_MBFT_181_XX);
    expect(campos.competencia).toBe('Órgão ou Entidade de Trânsito Municipal e Rodoviário.');
  });

  it('não confunde "Quando Autuar" com "Quando NÃO Autuar"', () => {
    const campos = parseMbftFields(TEXTO_MBFT_181_XX);
    // Neste chunk ambos vêm vazios; o ponto é não vazar conteúdo de um no outro.
    expect(campos.quandoAutuar).toBeNull();
    expect(campos.quandoNaoAutuar).toBeNull();
  });

  it('separa os exemplos numerados do campo de observações', () => {
    const campos = parseMbftFields(TEXTO_MBFT_181_XX);

    expect(campos.exemplosObservacoes).toHaveLength(2);
    expect(campos.exemplosObservacoes[0]).toMatch(/^1\.\s*Veículo estacionado em vaga sinalizada como de uso exclusivo de idoso/);
    expect(campos.exemplosObservacoes[1]).toMatch(/^2\.\s*Veículo estacionado em vaga sinalizada como de uso exclusivo de pessoa/);
    // Subitens (1.1, 1.2) não abrem novos itens.
    expect(campos.exemplosObservacoes[0]).toContain('1.1 sem credencial');
  });

  it('devolve campos nulos para texto sem rótulos (CTB puro)', () => {
    const campos = parseMbftFields(TEXTO_CTB_SIMPLES);

    expect(campos.tipificacao).toBeNull();
    expect(campos.infrator).toBeNull();
    expect(campos.competencia).toBeNull();
    expect(campos.exemplosObservacoes).toEqual([]);
  });

  it('devolve campos nulos para texto vazio', () => {
    const campos = parseMbftFields('');

    expect(campos.tipificacao).toBeNull();
    expect(campos.infrator).toBeNull();
  });
});

describe('extrairMbftFields', () => {
  it('escolhe o chunk com mais campos rotulados', () => {
    const campos = extrairMbftFields([TEXTO_CTB_SIMPLES, TEXTO_MBFT_181_XX]);

    expect(campos).not.toBeNull();
    expect(campos?.infrator).toBe('Condutor');
  });

  it('devolve null quando nenhum chunk tem rótulos do MBFT', () => {
    expect(extrairMbftFields([TEXTO_CTB_SIMPLES])).toBeNull();
    expect(extrairMbftFields([])).toBeNull();
  });
});

describe('parseMbftFields — variações reais do texto indexado', () => {
  const ART_182_IV = `Art. 182, IV. Tipificação do Enquadramento: Parar o veículo em desacordo com as posições estabelecidas neste Código. Gravidade: Leve
Penalidade: Multa
Medida Administrativa: Não Pode Configurar Crime de Trânsito:
NÃO Infrator: Condutor Competência: Órgão ou Entidade de Trânsito Municipal e Rodoviário. Pontuação: 3 Constatação da Infração: Possível sem abordagem.
Quando Autuar: Quando NÃO Autuar: Definições e Procedimentos: Exemplos do Campo de Observações do AIT:
1. Veículo efetuando embarque ou desembarque em ângulo em relação à guia da calçada (meio-fio).
1. Motocicleta efetuando embarque perpendicular ao meio-fio: utilizar enquadramento específico: 559-20, art. 182, III.
2. Veículo obedecendo à regulamentação de estacionamento do local.`;

  const ART_176_III = `Art. 176, III. Tipificação do Enquadramento: Deixar o condutor envolvido em acidente com vítima de preservar o local. Gravidade: Gravíssima
Penalidade: Multa (5X) e Suspensão do direito de dirigir
Medida Administrativa: Recolhimento do Documento de Habilitação.
Pode Configurar Infração Penal:
SIM 312 do CTBInfrator: Condutor Competência: Órgão ou Entidade de Trânsito Estadual e Rodoviário. Pontuação: Não Computável Constatação da Infração: Possível sem Abordagem. Quando AUTUAR Quando NÃO Autuar Definições e Procedimentos Exemplos do Campo de Observações do AIT:
1. Condutor que remove elemento do local do acidente.`;

  it('lê amparo, pontuação e "Medida Administrativa: Não"', () => {
    const c = parseMbftFields(ART_182_IV);
    expect(c.amparo).toBe('Art. 182, IV');
    expect(c.pontuacao).toBe('3');
    expect(c.medidaAdministrativa).toBe('Não');
    expect(c.configuraCrime).toBe('NÃO');
    expect(c.competencia).toBe('Órgão ou Entidade de Trânsito Municipal e Rodoviário.');
  });

  it('separa Quando Autuar e Quando NÃO Autuar quando a numeração recomeça', () => {
    const c = parseMbftFields(ART_182_IV);
    expect(c.quandoAutuar).toMatch(/^1\. Veículo efetuando embarque/);
    expect(c.quandoNaoAutuar).toMatch(/^1\. Motocicleta/);
    expect(c.quandoNaoAutuar).toMatch(/2\. Veículo obedecendo/);
  });

  it('aceita "Pode Configurar Infração Penal" e "Quando AUTUAR" sem dois-pontos', () => {
    const c = parseMbftFields(ART_176_III);
    expect(c.configuraCrime).toBe('SIM 312 do CTB');
    expect(c.infrator).toBe('Condutor');
    expect(c.pontuacao).toBe('Não Computável');
    expect(c.exemplosObservacoes).toEqual(['1. Condutor que remove elemento do local do acidente.']);
  });

  it('lista cada ficha uma vez, a mais completa primeiro', () => {
    const cortada = 'Art. 182, IV. Tipificação do Enquadramento: Parar o veículo em desacordo com as posições estabelecidas neste Código. Gravidade: Leve\nPenalidade: Multa';
    const fichas = listarFichasMbft([cortada, ART_182_IV, ART_176_III]);
    expect(fichas.map((f) => f.amparo)).toEqual(['Art. 182, IV', 'Art. 176, III']);
  });
});
