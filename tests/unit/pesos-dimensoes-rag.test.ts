import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarTrechosPesos, explicarPesos, montarContextoPesos } from '@/lib/pesos-dimensoes/rag';

describe('RAG local de pesos e dimensões', () => {
  it.each([
    ['nota sem kg', /Art\. 49/i],
    ['peso carreta', /Art\. 6/i],
    ['5 por cento', /Art\. 50/i],
    ['eixo tandem', /Art\. (6|9)/i],
    ['quem responde embarcador', /Art\. 56|683-1[123]/i],
    ['CMT acima de mil', /Art\. 58|690-40/i],
  ])('recupera a fonte correta para “%s”', (consulta, referenciaEsperada) => {
    const trechos = buscarTrechosPesos(consulta, 5);
    expect(trechos.length).toBeGreaterThan(0);
    expect(trechos.some((trecho) => referenciaEsperada.test(`${trecho.referencia} ${trecho.codigo ?? ''}`))).toBe(true);
    expect(trechos.every((trecho) => trecho.pagina > 0 && trecho.texto.length > 20)).toBe(true);
  });

  it('monta contexto com citações verificáveis', () => {
    const contexto = montarContextoPesos(buscarTrechosPesos('5 por cento', 2));
    expect(contexto).toMatch(/Resolução CONTRAN nº 882\/2021/);
    expect(contexto).toMatch(/Art\. 50/);
    expect(contexto).toMatch(/p\. 14|página 14/i);
  });

  it('mantém resposta oficial em português quando a IA falha', async () => {
    jest.spyOn(ProviderChain.prototype, 'generateRapido').mockRejectedValueOnce(new Error('indisponível'));
    const resposta = await explicarPesos('qual a tolerância na balança?');

    expect(resposta.origem).toBe('fontes-oficiais');
    expect(resposta.resposta).toMatch(/tolerância|pesagem/i);
    expect(resposta.fontes.length).toBeGreaterThan(0);
    expect(resposta.resposta).not.toMatch(/\b(?:answer|summary|source)\b/i);
  });
});
