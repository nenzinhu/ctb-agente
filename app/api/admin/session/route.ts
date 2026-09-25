import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

/**
 * Validate admin session
 * GET /api/admin/session
 */
export async function GET() {
  try {
    const isValid = await validateSession();

    if (!isValid) {
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}
