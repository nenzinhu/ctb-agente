/** @jest-environment node */
const listarDocumentos = jest.fn();
jest.mock('../../lib/apostila/repositorio', () => ({
  listarDocumentosApostila: (...args: unknown[]) => listarDocumentos(...args),
}));

const gerarDocumento = jest.fn();
jest.mock('../../app/api/apostila/handler', () => ({
  gerarApostilaDocumento: (...args: unknown[]) => gerarDocumento(...args),
}));

let bancoConfigurado = true;
jest.mock('../../lib/db/client', () => ({
  get databaseAdminConfigured() { return bancoConfigurado; },
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/apostila/route';

const id = '11111111-1111-4111-8111-111111111111';
const documentoPublico = {
  id, titulo: 'Manual de POP', colecao: 'pop', paginas: 200,
  paginaMaximaDisponivel: 198, trechos: 30, situacao: 'revisar',
};

const post = (corpo: unknown) => POST(new NextRequest('http://localhost/api/apostila', {
  method: 'POST', body: JSON.stringify(corpo), headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
}));

describe('GET /api/apostila', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bancoConfigurado = true;
    listarDocumentos.mockResolvedValue([documentoPublico]);
  });

  it('lista o catálogo inicial sem exigir pesquisa', async () => {
    const response = await GET(new NextRequest('http://localhost/api/apostila'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ documentos: [documentoPublico], bancoConfigurado: true });
    expect(listarDocumentos).toHaveBeenCalledWith('', 30);
  });

  it('limita a consulta a 200 caracteres e não expõe campos internos', async () => {
    listarDocumentos.mockResolvedValue([{ ...documentoPublico, hashConteudo: undefined, nome_arquivo: undefined }]);
    const response = await GET(new NextRequest(`http://localhost/api/apostila?q=${'a'.repeat(250)}`));
    const corpo = await response.json();
    expect(listarDocumentos).toHaveBeenCalledWith('a'.repeat(200), 30);
    expect(JSON.stringify(corpo)).not.toContain('hashConteudo');
    expect(JSON.stringify(corpo)).not.toContain('nome_arquivo');
  });

  it('responde imediatamente quando o banco de servidor não está configurado', async () => {
    bancoConfigurado = false;
    const response = await GET(new NextRequest('http://localhost/api/apostila'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ documentos: [], bancoConfigurado: false });
    expect(listarDocumentos).not.toHaveBeenCalled();
  });

  it('explica em português quando a migração do catálogo está pendente', async () => {
    listarDocumentos.mockRejectedValue(new Error('function search_documentos_apostila does not exist'));
    const response = await GET(new NextRequest('http://localhost/api/apostila?q=pop'));
    expect(response.status).toBe(503);
    expect((await response.json()).message).toMatch(/migração 014/i);
  });
});

describe('POST /api/apostila', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bancoConfigurado = true;
    gerarDocumento.mockResolvedValue({
      titulo: 'Apostila — POP', selecaoRotulo: 'documento inteiro',
      documento: { ...documentoPublico, hashConteudo: 'segredo' }, capitulos: [],
    });
  });

  it('valida UUID, título e intervalos', async () => {
    expect((await post({ documentoId: 'x', selecao: { modo: 'inteiro' }, publico: 'agente' })).status).toBe(400);
    expect((await post({ documentoId: id, selecao: { modo: 'paginas' }, publico: 'agente' })).status).toBe(400);
    expect((await post({ documentoId: id, selecao: { modo: 'inteiro' }, publico: 'agente', titulo: 'x'.repeat(121) })).status).toBe(400);
  });

  it('envia somente campos validados ao gerador e remove o hash da resposta', async () => {
    const response = await post({
      documentoId: id, selecao: { modo: 'paginas', intervalos: '10-18' }, publico: 'agente',
      titulo: 'Fiscalização', situacao: 'vigente', texto: 'conteúdo falso',
    });
    const corpo = await response.json();
    expect(response.status).toBe(200);
    expect(gerarDocumento).toHaveBeenCalledWith({
      documentoId: id, selecao: { modo: 'paginas', intervalos: '10-18' }, publico: 'agente', titulo: 'Fiscalização',
    }, '10.0.0.1');
    expect(corpo.documento.hashConteudo).toBeUndefined();
  });

  it.each([
    ['not_found', 404],
    ['pagina_indisponivel', 409],
    ['paginas_sem_texto', 400],
    ['conteudo_excessivo', 413],
    ['selecao_invalida', 400],
    ['rate_limit_exceeded', 429],
    ['ip_blocked', 403],
  ])('mapeia %s para HTTP %i', async (erro, status) => {
    gerarDocumento.mockResolvedValue({ erro, mensagem: 'Detalhe seguro.' });
    const response = await post({ documentoId: id, selecao: { modo: 'inteiro' }, publico: 'agente' });
    expect(response.status).toBe(status);
    expect((await response.json()).message).toBeTruthy();
  });
});
