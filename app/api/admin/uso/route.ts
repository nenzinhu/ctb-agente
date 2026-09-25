// Admin usage report: queries per day, cache hit rate, unanswered questions
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { getUsageStats } from '@/lib/ratelimit/limiter';
import { getCacheStats } from '@/lib/response/cache';

/**
 * GET /api/admin/uso?dias=30
 * @returns Usage and cache statistics
 */
export async function GET(request: NextRequest) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dias = Number(request.nextUrl.searchParams.get('dias') ?? 30);
  const janela = Number.isFinite(dias) ? Math.min(365, Math.max(1, Math.trunc(dias))) : 30;

  const [uso, cache] = await Promise.all([getUsageStats(janela), getCacheStats()]);

  const taxaCache = uso.total > 0 ? Math.round((uso.cacheHits / uso.total) * 100) : 0;

  return NextResponse.json(
    {
      janelaDias: janela,
      ...uso,
      taxaCache,
      cache,
    },
    { status: 200 }
  );
}
