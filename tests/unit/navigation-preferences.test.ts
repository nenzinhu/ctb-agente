import {validarAbas,ordenarAbas,ABAS_PADRAO} from '../../lib/navigation';
it('aceita três destinos únicos e conhecidos; rejeita links externos ou duplicados',()=>{
 expect(validarAbas(['/pesos-dimensoes','/estrangeiros','/pop'])).toBe(true);
 for(const x of [null,[],['/pop','/pop','/'],['/','/pop','https://externo.test']])expect(validarAbas(x)).toBe(false);
 expect(ordenarAbas(['/pesos-dimensoes','/estrangeiros','/pop']).slice(0,3).map(d=>d.href)).toEqual(['/pesos-dimensoes','/estrangeiros','/pop']);
 expect(new Set(ordenarAbas(ABAS_PADRAO).map(d=>d.href)).size).toBe(ordenarAbas(ABAS_PADRAO).length);
});
