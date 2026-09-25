'use client';

import { useState } from 'react';
import Icone from '@/components/ui/Icone';

/**
 * Admin login page
 * Username: set on the server (hardcoded)
 * Password: hashed with bcrypt (from ADMIN_PASSWORD_HASH env var)
 */
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Prefer the human message: `error` is a machine code such as
        // "invalid_credentials", which means nothing to the master.
        setError(data.message || 'Não foi possível entrar. Tente novamente.');
        return;
      }

      // Hard navigation, not router.push: the shell prefetches /admin while the
      // visitor is still anonymous, and the middleware answers that prefetch with
      // a redirect to this same page. The client router caches that redirect, so
      // pushing /admin right after a successful login just replays it and the
      // master lands back here, as if the credentials had been wrong.
      window.location.assign('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro de conexão ao entrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-28 pt-10 sm:pt-16">
      <div className="card card-pad">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Icone nome="engrenagem" tamanho={24} />
        </span>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-ink">Entrar no painel</h1>
        <p className="mt-1 text-center text-sm text-muted">Acesso restrito ao master do CTB Agente.</p>

        {error && (
          <div className="alert-error mt-6" role="alert">
            <Icone nome="alerta" className="mt-0.5 shrink-0 text-danger" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="label">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={isLoading || !username || !password} className="btn-primary w-full text-base">
            {isLoading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          A senha é definida por <code className="font-mono">ADMIN_PASSWORD_HASH</code> no servidor.
        </p>
      </div>
    </main>
  );
}
