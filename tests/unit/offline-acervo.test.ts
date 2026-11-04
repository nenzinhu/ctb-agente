import { buscarOffline, pacoteValido } from '@/lib/offline/model';
const pacote = { schema: 1, versao: 'v1', artigos: [{ numero: '165', texto: 'Art. 165. Dirigir sob influência.', versao: 'v1', fonte: 'https://www.planalto.gov.br/', aviso: 'Confira a fonte.' }], fichas: [{ codigo: '516-91', tipificacaoResumida: 'Dirigir sob influência', amparoLegal: 'Art. 165.', quandoAutuar: [], quandoNaoAutuar: [] }], pops: [] };
it('encontra artigo e código exatos localmente, sem misturar sufixos', () => {
  expect(buscarOffline(pacote as never, 'art. 165').artigos).toHaveLength(1);
  expect(buscarOffline(pacote as never, '51691').fichas[0].codigo).toBe('516-91');
  expect(buscarOffline(pacote as never, 'art. 165-A').artigos).toHaveLength(0);
});
it('rejeita pacotes corrompidos', () => { expect(pacoteValido({ schema: 1, versao: 'x', artigos: 'errado' })).toBe(false); expect(pacoteValido(null)).toBe(false); });
it('aceita os dados publicados do MBFT e dos POPs', () => {
  expect(pacoteValido({ ...pacote, fichas: require('../../data/acervo/mbft-fichas.json'), pops: require('../../data/acervo/pop-pmsc.json') })).toBe(true);
});
