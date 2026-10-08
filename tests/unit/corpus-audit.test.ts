import { auditEnquadramentos, SEED_EXAMPLE_CODES } from '@/lib/mbft/corpus-audit';
import type { Enquadramento } from '@/lib/db/schema';
import type { FichaMbft } from '@/lib/mbft/parser';

const enq = (overrides: Partial<Enquadramento> = {}): Enquadramento => ({
  id: '1', codigo_mbft: '763-31', desdobramento: 0,
  descricao: 'Dirigir segurando telefone celular', gravidade: 'gravíssima', pontos: 7,
  valor_multa: 29347, unidade: 'R$', retem_veiculo: false, remove_veiculo: false,
  recolhe_documento: null, amparo_legal: 'Art. 252, VI do CTB', medida_administrativa: '',
  responsavel: 'condutor', criado_em: '2026-01-01', ...overrides,
});

const ficha = (overrides: Partial<FichaMbft> = {}): FichaMbft => ({
  codigo: '763-31', tipificacaoResumida: 'Dirigir segurando telefone celular',
  amparoLegal: 'Art. 252, VI.', tipificacao: '', gravidade: 'Gravíssima', penalidade: 'Multa',
  medidaAdministrativa: 'Não aplicável', configuraCrime: 'NÃO', infrator: 'Condutor',
  competencia: '', pontuacao: '7 pontos', constatacao: '', quandoAutuar: [], quandoNaoAutuar: [],
  definicoes: [], exemplos: [], informacoesComplementares: [], pagina: 1, ...overrides,
});

describe('auditEnquadramentos', () => {
  it('ignora diferenças cosméticas e sempre pede revisão humana da multa', () => {
    const report = auditEnquadramentos([enq()], [ficha()]);
    expect(report.itens[0].divergencias).toEqual([]);
    expect(report.itens[0].revisaoHumana).toContain('valor_multa');
  });

  it('aponta divergências materiais sem modificar valores', () => {
    const report = auditEnquadramentos(
      [enq({ gravidade: 'grave', pontos: 5 })],
      [ficha()]
    );
    expect(report.itens[0].divergencias.map((d) => d.campo)).toEqual(['gravidade', 'pontos']);
  });

  it('não converte pontuação não computável em zero', () => {
    const report = auditEnquadramentos([enq({ pontos: 0 })], [ficha({ pontuacao: 'Não computável' })]);
    expect(report.itens[0].divergencias).toEqual([]);
    expect(report.itens[0].revisaoHumana).toContain('pontos');
  });

  it('mantém visível código ausente e detecta duplicidade', () => {
    const report = auditEnquadramentos([enq(), enq({ id: '2' })], []);
    expect(report.duplicados).toEqual(['763-31']);
    expect(report.itens[0].fichaEncontrada).toBe(false);
  });

  it('marca os cinco códigos de exemplo conhecidos', () => {
    expect(SEED_EXAMPLE_CODES).toHaveLength(5);
    const report = auditEnquadramentos([enq({ codigo_mbft: '516-91' })], []);
    expect(report.itens[0].exemploSeed).toBe(true);
  });
});
