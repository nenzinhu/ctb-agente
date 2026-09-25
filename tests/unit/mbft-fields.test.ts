import { parseMbftFields, extrairMbftFields } from '@/lib/response/mbft-fields';

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
