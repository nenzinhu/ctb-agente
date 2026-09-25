// POST /api/transcribe — voice-to-text for hands-free consultation in the field
import { NextRequest, NextResponse } from 'next/server';
import { filterPII } from '@/lib/query/pii-filter';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB, enough for ~2 minutes of Opus
const MODEL = 'whisper-large-v3-turbo';

/**
 * POST /api/transcribe
 * Accepts multipart/form-data with an `audio` field and returns the transcript.
 * The transcript is PII-filtered so plates and documents never reach the LLM chain.
 * @returns { text } on success
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'transcription_unavailable',
        message: 'Transcrição de voz não configurada (GROQ_API_KEY ausente).',
      },
      { status: 503 }
    );
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const field = form.get('audio');
    if (field instanceof File) {
      audio = field;
    }
  } catch {
    return NextResponse.json(
      { error: 'invalid_form', message: 'Envie o áudio como multipart/form-data no campo "audio".' },
      { status: 400 }
    );
  }

  if (!audio || audio.size === 0) {
    return NextResponse.json(
      { error: 'missing_audio', message: 'Nenhum áudio recebido.' },
      { status: 400 }
    );
  }

  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'audio_too_large', message: 'Áudio maior que 10 MB. Grave um trecho mais curto.' },
      { status: 413 }
    );
  }

  try {
    const groqForm = new FormData();
    groqForm.append('file', audio, audio.name || 'consulta.webm');
    groqForm.append('model', MODEL);
    groqForm.append('language', 'pt');
    groqForm.append('response_format', 'json');
    groqForm.append(
      'prompt',
      'Consulta sobre legislação de trânsito brasileira (CTB): códigos de infração, artigos e situações.'
    );

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    if (!response.ok) {
      const detalhe = await response.text();
      console.error('Groq transcription failed:', response.status, detalhe);
      return NextResponse.json(
        { error: 'transcription_failed', message: 'Não foi possível transcrever o áudio.' },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { text?: string };
    const texto = filterPII((data.text || '').trim());

    if (!texto) {
      return NextResponse.json(
        { error: 'empty_transcript', message: 'Nenhuma fala detectada no áudio.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: texto }, { status: 200 });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erro interno ao transcrever o áudio.' },
      { status: 500 }
    );
  }
}
