import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

/**
 * Admin logout API endpoint
 * POST /api/admin/logout
 */
export async function POST() {
  try {
    await clearSession();
    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
