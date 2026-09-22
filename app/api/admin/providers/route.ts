// Admin view of the pluggable AI provider chain
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { listProviders, pingProvider } from '@/lib/ai/providers/registry';

/**
 * GET /api/admin/providers
 * @returns Provider chain in fallback order, with configuration status
 */
export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ providers: listProviders() }, { status: 200 });
}

/**
 * POST /api/admin/providers
 * Body: { providerId } — runs a live ping against the provider.
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let providerId: string | undefined;
  try {
    const body = (await request.json()) as { providerId?: string };
    providerId = body.providerId;
  } catch {
    providerId = undefined;
  }

  if (!providerId) {
    return NextResponse.json({ error: 'missing_provider' }, { status: 400 });
  }

  const resultado = await pingProvider(providerId);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
