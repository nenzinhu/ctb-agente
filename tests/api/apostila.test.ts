/**
 * @jest-environment node
 */
const checkRateLimit = jest.fn();
const recordQuery = jest.fn();
jest.mock('../../lib/ratelimit/limiter', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
  recordQuery: (...a: unknown[]) => recordQuery(...a),
}));

const getCachedValue = jest.fn();
const setCachedValue = jest.fn();
jest.mock('../../lib/response/cache', () => ({
  getCachedValue: (...a: unknown[]) => getCachedValue(...a),
  setCachedValue: (...a: unknown[]) => setCachedValue(...a),
}));

const generateRapido = jest.fn();
jest.mock('../../lib/ai/providers/chain', () => ({
  ProviderChain: jest.fn().mockImplementation(() => ({ ativos: ['Groq'], generateRapido: (...a: unknown[]) => generateRapido(...a) })),
}));

import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { GET, POST } from '@/app/api/apostila/route';
import { blocosDaApostila } from '@/lib/rag/apostila';
import { pdfDeBlocos } from '@/lib/pdf-tools/pdf-writer';

const post = (corpo: unknown) =>
  POST(new NextRequest('http://localhost/api/apostila', { method: 'POST', body: JSON.stringify(corpo) }));

describe('/api/apostila', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 20, blocked: false, registroId: 'r1' });
    getCachedValue.mockResolvedValue(null);
    generateRapido.mockResolvedValue({ texto: '## Objetivos\n- Entender a regra.', provedor: 'Groq', modelo: 'llama' });
  });

  it('suggests official items for a theme', async () => {
    const corpo = await (await GET(new NextRequest('http://localhost/api/apostila?fonte=pop&tema=algemas'))).json();
    expect(corpo.itens[0]).toEqual({ id: '003', titulo: 'POP 003 — USO DE ALGEMA (TÉCNICA POLICIAL)' });
  });

  it('writes one chapter per item from the official text, for the chosen audience', async () => {
    const corpo = await (await post({ fonte: 'mbft', ids: ['516-91', '518-51'], publico: 'leigo' })).json();

    expect(corpo.capitulos.map((c: { id: string }) => c.id)).toEqual(['516-91', '518-51']);
    expect(generateRapido).toHaveBeenCalledTimes(2);
    expect(generateRapido.mock.calls[0][0]).toMatch(/pessoas leigas/);
    expect(generateRapido.mock.calls[0][0]).toMatch(/Questões de fixação/);
    expect(setCachedValue).toHaveBeenCalledWith('apostila:v2:mbft:516-91:leigo', expect.any(Object), expect.any(Object));
  });

  it('falls back to the official text when the models fail', async () => {
    generateRapido.mockRejectedValue(new Error('All providers failed'));
    const corpo = await (await post({ fonte: 'pop', ids: ['003'] })).json();

    expect(corpo.capitulos[0].modelo).toBeNull();
    expect(corpo.capitulos[0].texto).toMatch(/^## Texto oficial/);
  });

  it('rejects empty or oversized handouts', async () => {
    expect((await post({ fonte: 'mbft', ids: [] })).status).toBe(400);
    expect((await post({ fonte: 'mbft', ids: Array(7).fill('516-91') })).status).toBe(400);
  });
});

describe('apostila em PDF', () => {
  it('turns the chapters into styled blocks and a valid PDF', async () => {
    const blocos = blocosDaApostila([
      { id: '003', titulo: 'POP 003 — USO DE ALGEMA', texto: '## Objetivos\n- Algemar com segurança.\n**Gabarito**\n1) a', modelo: 'Groq · llama' },
    ]);
    expect(blocos.map((b) => b.estilo)).toEqual(['titulo', 'subtitulo', 'item', 'subtitulo', 'item', 'nota']);
    expect(blocos[2].texto).toBe('• Algemar com segurança.');

    const pdf = await pdfDeBlocos('Apostila — algemas', blocos);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-');
  });

  it('brands the PDF with the road police crest and institution name', async () => {
    const logoJpeg = new Uint8Array(readFileSync('public/brasao-cpmrv.jpg'));
    const pdf = await pdfDeBlocos('Apostila — CTB', [], undefined, {
      instituicao: 'Polícia Militar Rodoviária de Santa Catarina',
      logoJpeg,
      logoLarguraPx: 115,
      logoAlturaPx: 144,
    });
    const conteudo = Buffer.from(pdf).toString('latin1');

    expect(conteudo).toContain('/Im0 Do');
    expect(conteudo).toContain('Pol\\355cia Militar Rodovi\\341ria de Santa Catarina');
  });
});
