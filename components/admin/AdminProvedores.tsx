'use client';

import { useCallback, useEffect, useState } from 'react';

interface ProviderStatus {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
  papel: string;
  ordem: number;
  configurado: boolean;
}

interface PingResult {
  provider: string;
  ok: boolean;
  modeloUsado: string;
  latenciaMs: number;
  resposta?: string;
  erro?: string;
}

/**
 * Shows the provider fallback chain and lets the master ping each provider
 */
export default function AdminProvedores() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [pings, setPings] = useState<Record<string, PingResult>>({});
  const [testando, setTestando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/providers');
      if (!resposta.ok) throw new Error('Falha ao carregar provedores.');
      const data = await resposta.json();
      setProviders(data.providers ?? []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const testar = async (id: string) => {
    setTestando(id);
    setErro(null);
    try {
      const resposta = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: id }),
      });
      const data = (await resposta.json()) as PingResult;
      setPings((atual) => ({ ...atual, [id]: data }));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setTestando(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cadeia de provedores de IA</h2>
        <p className="text-sm text-gray-600 mt-1">
          A consulta tenta os provedores nesta ordem. Se um falhar, o próximo assume; se todos
          falharem, a resposta vem apenas do banco (sem IA).
        </p>
      </div>

      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      <ul className="space-y-3">
        {providers.map((provider) => {
          const ping = pings[provider.id];
          return (
            <li
              key={provider.id}
              className="border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-4"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ctb-green text-white font-bold">
                {provider.ordem}
              </span>

              <div className="flex-1 min-w-[220px]">
                <p className="font-semibold text-gray-900">{provider.nome}</p>
                <p className="text-xs text-gray-600">
                  {provider.modeloPadrao} · {provider.papel}
                </p>
                <p className="text-xs text-gray-500">Variável: {provider.envVar}</p>
              </div>

              <span
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  provider.configurado
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {provider.configurado ? 'configurado' : 'sem chave'}
              </span>

              <button
                onClick={() => testar(provider.id)}
                disabled={testando === provider.id}
                className="px-3 py-1 rounded border border-ctb-green text-ctb-green text-sm font-semibold hover:bg-ctb-green/10 disabled:opacity-60"
              >
                {testando === provider.id ? 'Testando…' : 'Testar ping'}
              </button>

              {ping && (
                <p
                  className={`w-full text-sm ${ping.ok ? 'text-green-700' : 'text-red-700'}`}
                  role="status"
                >
                  {ping.ok
                    ? `✅ ${ping.provider} respondeu em ${ping.latenciaMs} ms ("${ping.resposta}")`
                    : `❌ ${ping.provider}: ${ping.erro}`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
