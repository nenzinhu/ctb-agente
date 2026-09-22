// POST /api/consulta endpoint
import { NextRequest, NextResponse } from 'next/server';
import { ConsultaRequestSchema } from './types';
import { handleConsulta } from './handler';

/**
 * POST /api/consulta
 * Main consultation endpoint
 * Accepts query and returns structured response card
 * @example
 * POST /api/consulta
 * { "consulta": "516-91" }
 * @returns { enquadramento, type } or { error }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consulta, turnstileToken } = ConsultaRequestSchema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const result = await handleConsulta(consulta, ipAddress, turnstileToken);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Consulta error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
