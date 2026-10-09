import { buscarFichas } from '@/lib/mbft/fichas';
import { buscarPops } from '@/lib/pop/pops';
import { hybridSearch } from '@/lib/search/hybrid';
import type { CasoBusca } from './cases';

export async function buscarParaDiagnostico(caso: CasoBusca): Promise<string[]> {
  if (caso.colecao === 'mbft') {
    return buscarFichas(caso.consulta, 3).map((ficha) => ficha.codigo).slice(0, 3);
  }
  if (caso.colecao === 'pop') {
    return buscarPops(caso.consulta, 3).map((pop) => pop.numero).slice(0, 3);
  }
  const resultados = await hybridSearch(caso.consulta, 3);
  return resultados.map((resultado) => resultado.numero_dispositivo).slice(0, 3);
}
