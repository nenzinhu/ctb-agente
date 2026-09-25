// Admin view of the pluggable AI provider chain
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import { listLiveModels, listProviders, pingProvider, PROVIDERS } from '@/lib/ai/providers/registry';
import { getAIPreference, setAIPreference } from '@/lib/ai/preference';

// "Testar todos" pings one model per request, but a big free model can take
// most of the 25s ping timeout on its own.
export const maxDuration = 60;

/**
 * GET /api/admin/providers
 * GET /api/admin/providers?modelos=<providerId> — that provider's live free catalog
 * @returns Provider chain in fallback order, with configuration status and
 * the master's current choice
 */
export async function GET(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const catalogo = request.nextUrl.searchParams.get('modelos');
  if (catalogo) {
    return NextResponse.json(await listLiveModels(catalogo), { status: 200 });
  }

  return NextResponse.json(
    { providers: listProviders(), preferencia: await getAIPreference() },
    { status: 200 }
  );
}

/**
 * POST /api/admin/providers
 * Body: { providerId, modelo? } — runs a live ping against the provider/model.
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let providerId: string | undefined;
  let modelo: string | undefined;
  try {
    const body = (await request.json()) as { providerId?: string; modelo?: string };
    providerId = body.providerId;
    modelo = typeof body.modelo === 'string' && body.modelo.trim() ? body.modelo.trim() : undefined;
  } catch {
    providerId = undefined;
  }

  if (!providerId) {
    return NextResponse.json({ error: 'missing_provider' }, { status: 400 });
  }

  const resultado = await pingProvider(providerId, modelo);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}

const PreferenciaSchema = z
  .object({ providerId: z.string().min(1), modelo: z.string().min(1).max(200) })
  .nullable();

/**
 * PUT /api/admin/providers
 * Body: { providerId, modelo } to pick the model the chain tries first, or
 * null to go back to the default order.
 */
export async function PUT(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PreferenciaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  if (parsed.data && !PROVIDERS.some((p) => p.id === parsed.data!.providerId)) {
    return NextResponse.json({ error: 'unknown_provider' }, { status: 400 });
  }

  try {
    await setAIPreference(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { error: 'persist_failed', message: error instanceof Error ? error.message : 'Falha ao salvar' },
      { status: 500 }
    );
  }
  return NextResponse.json({ preferencia: parsed.data }, { status: 200 });
}
