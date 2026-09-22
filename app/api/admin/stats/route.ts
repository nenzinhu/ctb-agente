import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/db/client';

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 * Requires valid admin session
 */
export async function GET() {
  try {
    // Validate session
    const isValid = await validateSession();
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch total count
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('dispositivos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Supabase error:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Fetch all documents to calculate stats by type
    const { data, error } = await supabaseAdmin
      .from('dispositivos')
      .select('tipo, data_publicacao')
      .order('data_publicacao', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Calculate stats by type
    const byType: Record<string, number> = {};
    let lastUpdated: string | null = null;

    if (data && data.length > 0) {
      lastUpdated = data[0].data_publicacao;

      data.forEach((doc) => {
        byType[doc.tipo] = (byType[doc.tipo] || 0) + 1;
      });
    }

    return NextResponse.json(
      {
        totalDocuments: totalCount || 0,
        byType,
        lastUpdated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching statistics' },
      { status: 500 }
    );
  }
}
