import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
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

    // Without credentials the list is legitimately empty; a 500 here would
    // look like a broken panel on a fresh deployment.
    if (!databaseConfigured) {
      return NextResponse.json(
        {
          documents: [],
          bancoConfigurado: false,
          message:
            'Banco não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 200 }
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
      { documents: data as Dispositivo[], bancoConfigurado: true },
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
