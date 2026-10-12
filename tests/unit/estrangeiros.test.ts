import { interpretarConsultaEstrangeiros } from '@/lib/estrangeiros/consulta';
import { avaliarEstrangeiro } from '@/lib/estrangeiros/motor';

describe('fiscalização de condutores e veículos estrangeiros', () => {
  it('interpreta país abreviado e documento vencido sem alterar códigos legais', () => {
    expect(interpretarConsultaEstrangeiros('argentino com carteira estrang venc')).toMatchObject({
      paisHabilitacao: 'AR',
      habilitacao: 'vencida',
    });
    expect(interpretarConsultaEstrangeiros('501-01')).toEqual({});
  });

  it('pede os fatos essenciais antes de apresentar conclusão', () => {
    const resultado = avaliarEstrangeiro({ paisHabilitacao: 'AR' });
    expect(resultado.estado).toBe('requer_conferencia');
    expect(resultado.perguntasPendentes).toEqual(expect.arrayContaining(['dataEntrada', 'habilitacao']));
    expect(resultado.infracoes).toHaveLength(0);
  });

  it('apresenta 501-00 como possibilidade condicional para habilitação estrangeira vencida', () => {
    const resultado = avaliarEstrangeiro({
      paisHabilitacao: 'AR',
      visitanteOuResidente: 'visitante',
      dataEntrada: '2026-10-01',
      habilitacao: 'vencida',
      identidadeApresentada: true,
      categoriaCompativel: true,
      registroVeiculo: 'brasileiro',
    });

    expect(resultado.estado).toBe('requer_conferencia');
    expect(resultado.infracoes).toContainEqual(expect.objectContaining({
      codigo: '501-00',
      artigo: 'Art. 162, I',
      condicional: true,
    }));
  });

  it('não presume acordo para país desconhecido', () => {
    const resultado = avaliarEstrangeiro({
      paisHabilitacao: 'ZZ',
      visitanteOuResidente: 'visitante',
      dataEntrada: '2026-10-01',
      habilitacao: 'valida',
      identidadeApresentada: true,
      categoriaCompativel: true,
      registroVeiculo: 'estrangeiro',
    });
    expect(resultado.estado).toBe('requer_conferencia');
    expect(resultado.baseInternacional).toMatch(/não foi confirmada/i);
  });
});
