import { compararPacotes } from '../../lib/offline/diff';
import type { PacoteOffline } from '../../lib/offline/model';
const pacote = (artigos: Array<{numero:string;texto:string}>) => ({schema:1,versao:'v',artigos,fichas:[],pops:[]} as unknown as PacoteOffline);
it('separa inclusões, exclusões e alterações textuais, sem confundir versão com mudança no conteúdo', () => {
  const a=pacote([{numero:'165',texto:'Texto original'},{numero:'166',texto:'Saiu'},{numero:'167',texto:'Igual'}]);
  const b=pacote([{numero:'165',texto:'Texto alterado'},{numero:'168',texto:'Entrou'},{numero:'167',texto:'Igual'}]);
  expect(compararPacotes(a,b).map(x=>[x.id,x.status])).toEqual([['165','alterado'],['166','removido'],['168','incluído']]);
  expect(compararPacotes(a,{...a,versao:'outra'})).toEqual([]);
});
