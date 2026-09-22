import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/db/client';
import { Dispositivo } from '@/lib/db/schema';

/**
 * Get all documents (dispositivos) for admin dashboard
 * GET /api/admin/documents
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

    // Fetch documents from Supabase
    const { data, error } = await supabaseAdmin
      .from('dispositivos')
      .select('*')
      .order('data_publicacao', { ascending: false })
      .limit(1000); // Reasonable limit for performance

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { documents: data as Dispositivo[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching documents' },
      { status: 500 }
    );
  }
}
