import { NextRequest, NextResponse } from 'next/server';
import { adminPasswordConfigured, getAdminUsername, verifyAdminCredentials } from '@/lib/auth/admin';
import { createSession } from '@/lib/auth/session';
import { sessionSecret } from '@/lib/auth/session-token';

/**
 * Admin login API endpoint
 * POST /api/admin/login
 * Body: { username: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'missing_credentials', message: 'Informe usuário e senha.' },
        { status: 400 }
      );
    }

    // Refuse early when the panel cannot be secured (production without a hash)
    if (process.env.NODE_ENV === 'production' && (!adminPasswordConfigured() || !sessionSecret())) {
      console.error(
        'Admin panel misconfigured: set ADMIN_PASSWORD_HASH (and optionally ADMIN_SESSION_SECRET).'
      );
      return NextResponse.json(
        {
          error: 'admin_not_configured',
          message:
            'Painel indisponível: ADMIN_PASSWORD_HASH não está configurada neste ambiente.',
        },
        { status: 503 }
      );
    }

    // Verify credentials
    const isValid = await verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Usuário ou senha inválidos.' },
        { status: 401 }
      );
    }

    // Create the signed session. `getAdminUsername` keeps the response honest
    // about who is logged in instead of echoing the posted username.
    await createSession(getAdminUsername());

    return NextResponse.json(
      { message: 'Login successful', username: getAdminUsername() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
