import {
  avaliarEnquadramento,
  type RespostasGuiadas,
} from '@/lib/mbft/enquadramento-guiado';
import { montarFundamentoAtuacao } from '@/lib/mbft/fundamento-atuacao';
import type { FichaMbft } from '@/lib/mbft/parser';

const ficha = (codigo: string, resumo: string, autuar: string[], naoAutuar: string[] = []): FichaMbft => ({
  codigo, tipificacaoResumida: resumo, tipificacao: resumo, amparoLegal: 'Art. 252 do CTB',
  gravidade: 'Gravíssima', penalidade: 'Multa', medidaAdministrativa: '—', configuraCrime: 'Não',
  infrator: 'Condutor', competencia: 'Órgão de trânsito', pontuacao: '7 pontos', constatacao: 'Possível sem abordagem',
  quandoAutuar: autuar, quandoNaoAutuar: naoAutuar, definicoes: [], exemplos: [], informacoesComplementares: [], pagina: 1,
});

const SEGURANDO = ficha('763-31', 'Dirigir segurando telefone celular', ['1. Condutor dirigia segurando o aparelho.']);
const MANUSEANDO = ficha('763-32', 'Dirigir manuseando telefone celular', ['1. Condutor digitava ou consultava o aparelho.']);

describe('assistente de enquadramento guiado', () => {
  it('preserva a identidade de um código completo', () => {
    const resultado = avaliarEnquadramento({ descricao: 'código 76331', fichas: [SEGURANDO, MANUSEANDO] });
    expect(resultado.candidatos.map((item) => item.ficha.codigo)).toEqual(['763-31']);
    expect(resultado.perguntas).toEqual([]);
  });

  it('transforma diferenças oficiais em perguntas objetivas', () => {
    const resultado = avaliarEnquadramento({ descricao: 'condutor dirigia usando telefone celular', fichas: [SEGURANDO, MANUSEANDO] });
    expect(resultado.candidatos.map((item) => item.ficha.codigo)).toEqual(expect.arrayContaining(['763-31', '763-32']));
    expect(resultado.perguntas.map((item) => item.texto).join(' ')).toMatch(/segurando|digitava|consultava/i);
    expect(resultado.perguntas.every((item) => item.fonte === 'quando_autuar')).toBe(true);
  });

  it('usa a resposta para priorizar sem declarar uma opção correta', () => {
    const inicial = avaliarEnquadramento({ descricao: 'condutor dirigia usando telefone celular', fichas: [SEGURANDO, MANUSEANDO] });
    const pergunta = inicial.perguntas.find((item) => item.codigos.includes('763-32'))!;
    const respostas: RespostasGuiadas = { [pergunta.id]: 'sim' };
    const resultado = avaliarEnquadramento({ descricao: 'condutor dirigia usando telefone celular', respostas, fichas: [SEGURANDO, MANUSEANDO] });

    expect(resultado.candidatos[0].ficha.codigo).toBe('763-32');
    expect(resultado.candidatos[0].evidenciasFavoraveis).toContain(pergunta.criterio);
    expect(resultado.candidatos[0].evidencias).toContainEqual(expect.objectContaining({
      fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel',
      descricao: expect.stringMatching(/^Confirmado:/),
    }));
    expect(resultado.decisaoAutomatica).toBe(false);
  });

  it.each([
    ['quando_autuar', 'sim', 'favoravel', /^Confirmado:/],
    ['quando_autuar', 'nao', 'contraria', /^Não observado:/],
    ['quando_nao_autuar', 'sim', 'contraria', /^Hipótese de não autuar observada:/],
    ['quando_nao_autuar', 'nao', 'favoravel', /^Hipótese de não autuar não observada:/],
  ] as const)('preserva a polaridade %s/%s', (fonte, resposta, efeito, descricao) => {
    const alvo = fonte === 'quando_autuar'
      ? ficha('700-01', 'Conduta teste', ['Cenário observado.'])
      : ficha('700-01', 'Conduta teste', [], ['Exceção observada.']);
    const inicial = avaliarEnquadramento({ descricao: 'conduta teste', fichas: [alvo] });
    const pergunta = inicial.perguntas.find((item) => item.fonte === fonte)!;
    const resultado = avaliarEnquadramento({
      descricao: 'conduta teste',
      fichas: [alvo],
      respostas: { [pergunta.id]: resposta },
    });

    expect(resultado.candidatos[0].evidencias).toContainEqual(expect.objectContaining({
      fonte, resposta, efeito, descricao: expect.stringMatching(descricao),
    }));
  });

  it('não substitui um código completo ausente por outro parecido', () => {
    const resultado = avaliarEnquadramento({ descricao: '999-99', fichas: [SEGURANDO, MANUSEANDO] });
    expect(resultado.candidatos).toEqual([]);
  });

  it('monta o fundamento somente com os campos oficiais da ficha selecionada', () => {
    const fundamento = montarFundamentoAtuacao(MANUSEANDO, {
      evidencias: [{
        criterio: 'Condutor digitava ou consultava o aparelho.',
        fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel',
        descricao: 'Confirmado: Condutor digitava ou consultava o aparelho.',
      }],
      pendentes: [],
    });

    expect(fundamento).toMatchObject({
      codigo: '763-32',
      fatoConstatado: 'Dirigir manuseando telefone celular',
      amparoLegal: 'Art. 252 do CTB',
      responsavel: 'Condutor',
      penalidade: 'Multa',
      medidaAdministrativa: '—',
      fonte: 'MBFT — ficha 763-32, página 1',
    });
    expect(fundamento.elementosConfirmados).toEqual(['Confirmado: Condutor digitava ou consultava o aparelho.']);
    expect(fundamento.elementosAConfirmar).toEqual([]);
    expect(fundamento.texto).toContain('Fato constatado: Dirigir manuseando telefone celular');
    expect(fundamento.texto).toContain('Fonte: MBFT — ficha 763-32, página 1');
  });

  it('mantém visíveis critérios não confirmados e divergências antes da atuação', () => {
    const fundamento = montarFundamentoAtuacao(MANUSEANDO, {
      evidencias: [{
        criterio: 'Condutor digitava ou consultava o aparelho.',
        fonte: 'quando_autuar', resposta: 'nao', efeito: 'contraria',
        descricao: 'Não observado: Condutor digitava ou consultava o aparelho.',
      }],
      pendentes: [
        { criterio: 'Veículo estava em movimento.', fonte: 'quando_autuar' },
        { criterio: 'Condutor apenas entregava o aparelho.', fonte: 'quando_nao_autuar' },
      ],
    });

    expect(fundamento.elementosAConfirmar).toEqual([
      'Confirme se: Veículo estava em movimento.',
      'Confirme se a hipótese de não autuar ocorre: Condutor apenas entregava o aparelho.',
    ]);
    expect(fundamento.divergencias).toEqual(['Não observado: Condutor digitava ou consultava o aparelho.']);
    expect(fundamento.aptoParaConferenciaFinal).toBe(false);
  });

  it('aceita um cenário de quando autuar sem exigir cenários alternativos', () => {
    const alternativa = ficha(
      '700-02',
      'Conduta com cenários alternativos',
      ['Cenário A.', 'Cenário B.'],
      ['Hipótese de não autuar.']
    );
    const fundamento = montarFundamentoAtuacao(alternativa, {
      evidencias: [
        { criterio: 'Cenário A.', fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel', descricao: 'Confirmado: Cenário A.' },
        { criterio: 'Hipótese de não autuar.', fonte: 'quando_nao_autuar', resposta: 'nao', efeito: 'favoravel', descricao: 'Hipótese de não autuar não observada: Hipótese de não autuar.' },
      ],
      pendentes: [{ criterio: 'Cenário B.', fonte: 'quando_autuar' }],
    });

    expect(fundamento.elementosAConfirmar).toEqual([]);
    expect(fundamento.aptoParaConferenciaFinal).toBe(true);
  });

  it('não trata como divergência a negativa de uma alternativa quando outra foi confirmada', () => {
    const alternativa = ficha(
      '700-04',
      'Conduta com cenários alternativos respondidos',
      ['Cenário A.', 'Cenário B.'],
      ['Hipótese de não autuar.']
    );
    const fundamento = montarFundamentoAtuacao(alternativa, {
      evidencias: [
        { criterio: 'Cenário A.', fonte: 'quando_autuar', resposta: 'nao', efeito: 'contraria', descricao: 'Não observado: Cenário A.' },
        { criterio: 'Cenário B.', fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel', descricao: 'Confirmado: Cenário B.' },
        { criterio: 'Hipótese de não autuar.', fonte: 'quando_nao_autuar', resposta: 'nao', efeito: 'favoravel', descricao: 'Hipótese de não autuar não observada: Hipótese de não autuar.' },
      ],
      pendentes: [],
    });

    expect(fundamento.divergencias).toEqual([]);
    expect(fundamento.aptoParaConferenciaFinal).toBe(true);
  });

  it('mantém toda hipótese oficial de não autuar sem resposta como pendência', () => {
    const comExclusao = ficha('700-03', 'Conduta com exclusão', ['Cenário aplicável.'], ['Exceção oficial.']);
    const fundamento = montarFundamentoAtuacao(comExclusao, {
      evidencias: [
        { criterio: 'Cenário aplicável.', fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel', descricao: 'Confirmado: Cenário aplicável.' },
      ],
      pendentes: [],
    });

    expect(fundamento.elementosAConfirmar).toContain(
      'Confirme se a hipótese de não autuar ocorre: Exceção oficial.'
    );
    expect(fundamento.aptoParaConferenciaFinal).toBe(false);
  });
});
