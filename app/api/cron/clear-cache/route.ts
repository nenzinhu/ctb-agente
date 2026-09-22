// GET /api/cron/clear-cache — Vercel Cron target (see vercel.json).
// Removes cache_respostas rows whose per-row ttl_dias has elapsed, keeping the
// table small and the hit rate honest. Protected by the CRON_SECRET header
// Vercel sends automatically; a manual call must present the same secret.
import { NextRequest, NextResponse } from 'next/server';
import { clearExpiredCache } from '@/lib/response/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/clear-cache
 * @returns Number of purged entries, or 401/503 on auth/config problems
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  // Vercel Cron sends "Bearer $CRON_SECRET" in the Authorization header.
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');

  // When no secret is configured the route stays locked: an unauthenticated
  // purge endpoint would let anyone erase the cache.
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const removidos = await clearExpiredCache();
    return NextResponse.json(
      {
        ok: true,
        removidos,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cache purge cron failed:', error);
    return NextResponse.json({ error: 'purge_failed' }, { status: 500 });
  }
}
