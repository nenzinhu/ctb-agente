import { lerRascunho, salvarRascunho, removerRascunho } from '@/lib/client/drafts';
it('recupera preenchimento e oculta identificadores reconhecidos antes de guardar', () => {
  salvarRascunho('ctb', { query: 'placa ABC1D23', atalho: 'palavra' });
  expect(lerRascunho<{ query: string }>('ctb')?.query).not.toContain('ABC1D23');
  removerRascunho('ctb'); expect(lerRascunho('ctb')).toBeNull();
});
it('tolera armazenamento corrompido', () => { localStorage.setItem('ctb-rascunho-pesos', '{erro'); expect(lerRascunho('pesos')).toBeNull(); });
