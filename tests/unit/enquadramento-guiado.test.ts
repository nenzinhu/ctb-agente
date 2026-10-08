import { avaliarEnquadramento, type RespostasGuiadas } from '@/lib/mbft/enquadramento-guiado';
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
    expect(resultado.decisaoAutomatica).toBe(false);
  });

  it('não substitui um código completo ausente por outro parecido', () => {
    const resultado = avaliarEnquadramento({ descricao: '999-99', fichas: [SEGURANDO, MANUSEANDO] });
    expect(resultado.candidatos).toEqual([]);
  });
});
