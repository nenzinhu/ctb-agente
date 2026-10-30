import { saveQuery, getRecentQueries, clearRecentQueries } from '@/lib/search/local-storage';

const KEY = 'ctb-recent-queries';
describe('privacidade das consultas recentes', () => {
  beforeEach(() => localStorage.clear());

  it('não armazena descrições livres, placas ou documentos pessoais automaticamente', () => {
    for (const query of ['moto sem capacete', 'motorista João placa ABC1D23', 'CPF 123.456.789-00', 'art. 165 motorista João', '516-91 placa ABC1234']) saveQuery(query);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(getRecentQueries()).toEqual([]);
  });

  it('mantém apenas códigos e referências legais completas, com limite e deduplicação', () => {
    saveQuery('51691');
    saveQuery('art. 165');
    saveQuery('516-91');
    saveQuery('art. 181, XX');
    expect(getRecentQueries()).toEqual(['art. 181, XX', '516-91', 'art. 165']);
  });

  it('remove texto livre legado sem exibi-lo nem retê-lo no armazenamento', () => {
    localStorage.setItem(KEY, JSON.stringify(['motorista João ABC1D23', 'art. 165', 'moto sem capacete', '516-91']));
    expect(getRecentQueries()).toEqual(['art. 165', '516-91']);
    expect(localStorage.getItem(KEY)).not.toContain('João');
    expect(localStorage.getItem(KEY)).not.toContain('moto');
  });

  it('limpa o histórico e informa quando o aparelho recusa a remoção', () => {
    saveQuery('art. 165');
    const remove = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage blocked'); });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(clearRecentQueries()).toBe(false);
    expect(getRecentQueries()).toEqual(['art. 165']);
    remove.mockRestore(); error.mockRestore();
    expect(clearRecentQueries()).toBe(true);
    expect(getRecentQueries()).toEqual([]);
  });
});
