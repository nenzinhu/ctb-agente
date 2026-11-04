import {fireEvent,render,screen} from '@testing-library/react';
import OfflineAcervo from '../../components/offline/OfflineAcervo';
const ficha=require('../../data/acervo/mbft-fichas.json').find((f:{codigo:string})=>f.codigo==='751-01');
jest.mock('../../lib/offline/store',()=>({lerPacote:async()=>({baixadoEm:'2026-11-04T00:00:00Z',pacote:{schema:1,versao:'teste',artigos:[],fichas:require('../../data/acervo/mbft-fichas.json'),pops:[]}})}));
it('mantém a tipificação integral da ficha acessível no pacote offline',async()=>{
 render(<OfflineAcervo/>);
 const field=await screen.findByLabelText('Pesquisar no acervo offline');
 fireEvent.change(field,{target:{value:'751-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Consultar offline'}));
 expect(screen.getByText(ficha.tipificacao,{exact:true})).toBeInTheDocument();
});
