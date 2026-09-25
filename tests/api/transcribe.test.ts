/**
 * @jest-environment node
 */
// Tests for POST /api/transcribe
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/transcribe/route';

const fetchMock = jest.fn();

/**
 * Build a multipart request with an audio file
 * @param nome - Optional file name; when omitted no audio field is sent
 * @returns NextRequest
 */
function requisicaoComAudio(nome: string | null = 'consulta.webm'): NextRequest {
  const form = new FormData();
  if (nome) {
    form.append('audio', new File([new Uint8Array([1, 2, 3, 4])], nome, { type: 'audio/webm' }));
  }

  return new NextRequest('http://localhost/api/transcribe', { method: 'POST', body: form });
}

describe('POST /api/transcribe', () => {
  const originalKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalKey;
    }
  });

  it('returns 503 when no provider key is configured', async () => {
    delete process.env.GROQ_API_KEY;

    const resposta = await POST(requisicaoComAudio());
    expect(resposta.status).toBe(503);
    expect((await resposta.json()).error).toBe('transcription_unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 when no audio is sent', async () => {
    const resposta = await POST(requisicaoComAudio(null));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error).toBe('missing_audio');
  });

  it('returns the transcript and masks PII', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'placa ABC1234, motorista embriagado no art. 165' }),
    });

    const resposta = await POST(requisicaoComAudio());
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.text).toContain('art. 165');
    expect(corpo.text).not.toContain('ABC1234');
    expect(corpo.text).toContain('****');
  });

  it('propagates a provider failure as 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });

    const resposta = await POST(requisicaoComAudio());
    expect(resposta.status).toBe(502);
  });

  it('returns 422 when the transcript is empty', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ text: '   ' }) });

    const resposta = await POST(requisicaoComAudio());
    expect(resposta.status).toBe(422);
  });

  it('returns 500 when the fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const resposta = await POST(requisicaoComAudio());
    expect(resposta.status).toBe(500);
  });
});
