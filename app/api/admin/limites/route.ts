// Admin control of rate limits, Turnstile and the IP block list
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSession } from '@/lib/auth/session';
import {
  blockIp,
  getSettings,
  listBlockedIps,
  sanitizeRateLimit,
  unblockIp,
  updateSettings,
} from '@/lib/config/settings';

const LimitesSchema = z.object({
  consultas_por_hora: z.number().int().min(1).max(1000).optional(),
  turnstile_ativo: z.boolean().optional(),
});

const IpSchema = z.object({
  ip: z.string().min(3).max(64),
  motivo: z.string().max(200).optional(),
});

/**
 * GET /api/admin/limites
 * @returns Current settings, the effective limit and the block list
 */
export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const [settings, ipBloqueados] = await Promise.all([getSettings(), listBlockedIps()]);

  return NextResponse.json(
    {
      settings,
      ipBloqueados,
      turnstileConfigurado: Boolean(process.env.TURNSTILE_SECRET_KEY),
      siteKeyConfigurada: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    },
    { status: 200 }
  );
}

/**
 * PUT /api/admin/limites
 * Body: { consultas_por_hora?, turnstile_ativo? }
 */
export async function PUT(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = LimitesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  try {
    const settings = await updateSettings({
      consultas_por_hora:
        parsed.data.consultas_por_hora !== undefined
          ? sanitizeRateLimit(parsed.data.consultas_por_hora)
          : undefined,
      turnstile_ativo: parsed.data.turnstile_ativo,
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Falha ao atualizar os limites:', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/limites
 * Body: { ip, motivo? } — blocks an IP.
 */
export async function POST(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = IpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  try {
    await blockIp(parsed.data.ip, parsed.data.motivo ?? '');
    return NextResponse.json({ ok: true, ipBloqueados: await listBlockedIps() }, { status: 200 });
  } catch (error) {
    console.error('Falha ao bloquear o IP:', error);
    return NextResponse.json({ error: 'block_failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/limites?ip=1.2.3.4 — unblocks an IP.
 */
export async function DELETE(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const ip = request.nextUrl.searchParams.get('ip');
  if (!ip) {
    return NextResponse.json({ error: 'missing_ip' }, { status: 400 });
  }

  try {
    await unblockIp(ip);
    return NextResponse.json({ ok: true, ipBloqueados: await listBlockedIps() }, { status: 200 });
  } catch (error) {
    console.error('Falha ao desbloquear o IP:', error);
    return NextResponse.json({ error: 'unblock_failed' }, { status: 500 });
  }
}
