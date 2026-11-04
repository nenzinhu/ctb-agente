import {fireEvent,render,screen,within} from '@testing-library/react';
import NavigationPreferences from '../../components/NavigationPreferences';
import MobileNavigation from '../../components/mobile/MobileNavigation';
jest.mock('next/navigation',()=>({usePathname:()=>'/estrangeiros'}));
beforeEach(()=>localStorage.removeItem('ctb-abas-preferidas-v1'));
afterEach(()=>localStorage.removeItem('ctb-abas-preferidas-v1'));
it('salva a ordem, atualiza a navegação e permite restaurar o padrão',()=>{
 render(<><NavigationPreferences/><MobileNavigation/></>);
 fireEvent.click(screen.getByText('Escolher minhas três primeiras abas'));
 fireEvent.change(screen.getByLabelText('1ª aba'),{target:{value:'/pesos-dimensoes'}});
 fireEvent.change(screen.getByLabelText('2ª aba'),{target:{value:'/estrangeiros'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar minhas abas'}));
 const links=within(screen.getByRole('navigation')).getAllByRole('link');
 expect(links.slice(0,3).map(l=>l.getAttribute('href'))).toEqual(['/pesos-dimensoes','/estrangeiros','/favoritos']);
 expect(screen.getByRole('link',{name:'Estrangeiros'})).toHaveAttribute('aria-current','page');
 fireEvent.click(screen.getByRole('button',{name:'Restaurar ordem padrão'}));
 expect(within(screen.getByRole('navigation')).getAllByRole('link')[0]).toHaveAttribute('href','/');
});
it('não grava uma escolha duplicada',()=>{
 render(<NavigationPreferences/>);fireEvent.click(screen.getByText('Escolher minhas três primeiras abas'));
 fireEvent.change(screen.getByLabelText('1ª aba'),{target:{value:'/pop'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar minhas abas'}));
 expect(screen.getByRole('alert')).toHaveTextContent('Escolha três abas diferentes.');
 expect(localStorage.getItem('ctb-abas-preferidas-v1')).toBeNull();
});
