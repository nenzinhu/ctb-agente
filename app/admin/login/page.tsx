'use client';

import { useState } from 'react';
import Field from '@/components/ui/Field';
import Icone from '@/components/ui/Icone';
import PrimaryButton from '@/components/ui/PrimaryButton';

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
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-16 pt-10 sm:pt-16">
      <div className="card card-pad">
        <div className="card-head justify-center text-center">
          <h1 className="section-title">
            <Icone nome="engrenagem" tamanho={18} className="shrink-0" />
            Entrar no painel
          </h1>
        </div>
        <p className="text-center text-sm text-ds-subtle">Acesso restrito ao master do CTB Agente.</p>

        {error && (
          <div className="alert-error mt-6" role="alert">
            <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field
            id="username"
            label="Usuário"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />

          <Field
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />

          <PrimaryButton
            type="submit"
            carregando={isLoading}
            textoCarregando="Entrando…"
            disabled={!username || !password}
            className="w-full text-base"
          >
            Entrar
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-xs text-ds-subtle">
          A senha é definida por <code className="font-mono">ADMIN_PASSWORD_HASH</code> no servidor.
        </p>
      </div>
    </main>
  );
}
