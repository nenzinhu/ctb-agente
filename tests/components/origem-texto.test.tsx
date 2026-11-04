import {render,screen} from '@testing-library/react';
import OrigemTexto from '../../components/OrigemTexto';
it('distingue documento, cadastro, IA e revisão sem atribuir confirmação jurídica',()=>{
 render(<><OrigemTexto tipo="acervo"/><OrigemTexto tipo="cadastro"/><OrigemTexto tipo="ia"/><OrigemTexto tipo="pendente"/></>);
 expect(screen.getByText('Texto do acervo documental')).toHaveAttribute('title',expect.stringContaining('Confira a redação vigente'));
 expect(screen.getByText('Informação cadastrada')).toHaveAttribute('title',expect.stringContaining('não confirma revisão jurídica'));
 expect(screen.getByText('Texto gerado por IA')).toBeInTheDocument();
 expect(screen.getByText('Revisão pendente')).toBeInTheDocument();
});
