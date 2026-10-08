import { rerankearComIaSeAmbiguo } from '@/lib/search/ai-reranker';
import type { CandidatoReordenado } from '@/lib/search/reranker';

const candidatos: CandidatoReordenado[] = [
  { id: 'a', colecao: 'pop', titulo: 'Busca pessoal', texto: 'Procedimento A', score: 0.61, motivos: [] },
  { id: 'b', colecao: 'pop', titulo: 'Uso de algemas', texto: 'Procedimento B', score: 0.6, motivos: [] },
  { id: 'c', colecao: 'pop', titulo: 'Barreira', texto: 'Procedimento C', score: 0.3, motivos: [] },
];

describe('reranking por IA em consultas ambíguas', () => {
  it('aceita somente uma ordem composta por IDs recuperados', async () => {
    const resultado = await rerankearComIaSeAmbiguo('qual procedimento?', candidatos, async () => '{"ids":["b","a"]}');
    expect(resultado.candidatos.map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(resultado.usouIa).toBe(true);
  });

  it('mantém a ordem local quando a IA inventa um ID', async () => {
    const resultado = await rerankearComIaSeAmbiguo('qual procedimento?', candidatos, async () => '{"ids":["x","a"]}');
    expect(resultado.candidatos).toEqual(candidatos);
    expect(resultado.usouIa).toBe(false);
  });

  it('não chama IA quando o ranking não é ambíguo', async () => {
    const gerar = jest.fn(async () => '{"ids":["b","a"]}');
    const claros = candidatos.map((item, indice) => ({ ...item, score: 1 - indice * 0.2 }));
    const resultado = await rerankearComIaSeAmbiguo('busca pessoal', claros, gerar);
    expect(gerar).not.toHaveBeenCalled();
    expect(resultado.candidatos).toEqual(claros);
  });
});
