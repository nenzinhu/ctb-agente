/** @jest-environment node */

import { DocumentoMetadataSchema } from '@/lib/quality/metadata';

const validos = {
  fonteOficial: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
  versao: 'Lei nº 9.503/1997 — compilada',
  vigenteDesde: '2024-01-01',
  conferidoEm: '2026-09-01',
};

describe('DocumentoMetadataSchema', () => {
  it('normaliza metadados válidos e assume fonte vigente', () => {
    expect(DocumentoMetadataSchema.parse(validos)).toEqual({ ...validos, situacao: 'vigente' });
  });

  it.each([
    ['fonteOficial', { ...validos, fonteOficial: '   ' }, /fonte oficial/i],
    ['versao', { ...validos, versao: '' }, /versão/i],
    ['vigenteDesde', { ...validos, vigenteDesde: '2025-02-30' }, /data de vigência/i],
    ['conferidoEm', { ...validos, conferidoEm: '09/10/2026' }, /data de conferência/i],
  ])('informa o campo %s em português', (campo, entrada, mensagem) => {
    const resultado = DocumentoMetadataSchema.safeParse(entrada);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: [campo], message: expect.stringMatching(mensagem) }),
      ]));
    }
  });

  it('rejeita conferência anterior à vigência', () => {
    const resultado = DocumentoMetadataSchema.safeParse({
      ...validos,
      vigenteDesde: '2026-09-02',
      conferidoEm: '2026-09-01',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.message).toMatch(/anterior à vigência/i);
  });

  it('rejeita data de conferência futura', () => {
    const resultado = DocumentoMetadataSchema.safeParse({ ...validos, conferidoEm: '2999-01-01' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.message).toMatch(/futura/i);
  });
});
