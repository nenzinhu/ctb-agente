/** @jest-environment node */

let autenticado = false;
const listarUltimosDiagnosticos = jest.fn();
const executarDiagnostico = jest.fn();

jest.mock('../../lib/auth/session', () => ({ validateSession: async () => autenticado }));
jest.mock('../../lib/quality/repository', () => ({
  listarUltimosDiagnosticos: (...args: unknown[]) => listarUltimosDiagnosticos(...args),
}));
jest.mock('../../lib/quality/diagnose', () => ({
  executarDiagnostico: (...args: unknown[]) => executarDiagnostico(...args),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/quality/route';
import { QualityMigrationPendingError } from '@/lib/ingestion/documents';

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/admin/quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('/api/admin/quality', () => {
  beforeEach(() => {
    autenticado = false;
    jest.clearAllMocks();
  });

  it('protege leitura e execução', async () => {
    expect((await GET()).status).toBe(401);
    expect((await post({ colecao: 'ctb' })).status).toBe(401);
  });

  it('valida a coleção em português', async () => {
    autenticado = true;
    const resposta = await post({ colecao: 'multas' });
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).message).toMatch(/coleção/i);
  });

  it('devolve somente os últimos diagnósticos armazenados', async () => {
    autenticado = true;
    listarUltimosDiagnosticos.mockResolvedValue([{ id: 'd1', colecao: 'ctb' }]);
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toMatchObject({ diagnosticos: [{ id: 'd1' }], migracaoPendente: false });
  });

  it('executa uma coleção válida', async () => {
    autenticado = true;
    executarDiagnostico.mockResolvedValue({ id: 'd2', colecao: 'pop', status: 'atencao' });
    const resposta = await post({ colecao: 'pop' });
    expect(resposta.status).toBe(200);
    expect(executarDiagnostico).toHaveBeenCalledWith('pop');
  });

  it('GET informa migration pendente sem falhar o painel', async () => {
    autenticado = true;
    listarUltimosDiagnosticos.mockRejectedValue(new QualityMigrationPendingError());
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toMatchObject({ diagnosticos: [], migracaoPendente: true });
  });

  it('POST pede a migration 011 com resposta acionável', async () => {
    autenticado = true;
    executarDiagnostico.mockRejectedValue(new QualityMigrationPendingError());
    const resposta = await post({ colecao: 'ctb' });
    expect(resposta.status).toBe(503);
    expect((await resposta.json()).message).toMatch(/migrations-011-document-quality\.sql/);
  });
});
