'use client';

import { useCallback, useEffect, useState } from 'react';

interface ProviderStatus {
  id: string;
  nome: string;
  envVar: string;
  modeloPadrao: string;
  modelos: string[];
  papel: string;
  cadastro: string;
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

interface Preferencia {
  providerId: string;
  modelo: string;
}

const chave = (providerId: string, modelo: string) => `${providerId}::${modelo}`;

// How many pings "Testar todos" keeps in flight — free tiers rate-limit
// bursts, and a 429 would be reported as a broken model.
const CONCORRENCIA = 3;

/**
 * Lists every free AI provider, lets the master test each model and pick
 * the one the chain tries first.
 */
export default function AdminProvedores() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [preferencia, setPreferencia] = useState<Preferencia | null>(null);
  const [selecionado, setSelecionado] = useState<Record<string, string>>({});
  const [catalogo, setCatalogo] = useState<Record<string, { modelos: string[]; erro?: string }>>({});
  const [pings, setPings] = useState<Record<string, PingResult>>({});
  const [testando, setTestando] = useState<Set<string>>(new Set());
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/providers');
      if (!resposta.ok) throw new Error('Falha ao carregar provedores.');
      const data = await resposta.json();
      setProviders(data.providers ?? []);
      setPreferencia(data.preferencia ?? null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const modeloDe = (provider: ProviderStatus) =>
    selecionado[provider.id] ??
    (preferencia?.providerId === provider.id ? preferencia.modelo : provider.modeloPadrao);

  const testarModelo = async (providerId: string, modelo: string): Promise<PingResult> => {
    const k = chave(providerId, modelo);
    setTestando((atual) => new Set(atual).add(k));
    try {
      const resposta = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, modelo }),
      });
      const data = (await resposta.json()) as PingResult;
      setPings((atual) => ({ ...atual, [k]: data }));
      return data;
    } catch (error) {
      const falha: PingResult = {
        provider: providerId,
        ok: false,
        modeloUsado: modelo,
        latenciaMs: 0,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
      setPings((atual) => ({ ...atual, [k]: falha }));
      return falha;
    } finally {
      setTestando((atual) => {
        const proximo = new Set(atual);
        proximo.delete(k);
        return proximo;
      });
    }
  };

  const testarTodos = async () => {
    setErro(null);
    setAviso(null);
    const fila = providers
      .filter((p) => p.configurado)
      .flatMap((p) => p.modelos.map((modelo) => ({ providerId: p.id, modelo })));

    if (fila.length === 0) {
      setErro('Nenhum provedor tem chave configurada — defina as variáveis de ambiente abaixo.');
      return;
    }

    setProgresso({ feitos: 0, total: fila.length });
    let proximo = 0;
    let funcionando = 0;
    const trabalhador = async () => {
      while (proximo < fila.length) {
        const item = fila[proximo++];
        const resultado = await testarModelo(item.providerId, item.modelo);
        if (resultado.ok) funcionando++;
        setProgresso((atual) => (atual ? { ...atual, feitos: atual.feitos + 1 } : atual));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, trabalhador));
    setProgresso(null);
    setAviso(`${funcionando} de ${fila.length} modelos responderam.`);
  };

  const verCatalogo = async (providerId: string) => {
    setCatalogo((atual) => ({ ...atual, [providerId]: { modelos: [], erro: 'Carregando…' } }));
    try {
      const resposta = await fetch(`/api/admin/providers?modelos=${encodeURIComponent(providerId)}`);
      const data = (await resposta.json()) as { modelos: string[]; erro?: string };
      setCatalogo((atual) => ({ ...atual, [providerId]: data }));
    } catch (error) {
      setCatalogo((atual) => ({
        ...atual,
        [providerId]: { modelos: [], erro: error instanceof Error ? error.message : 'Erro desconhecido' },
      }));
    }
  };

  const salvarPreferencia = async (valor: Preferencia | null) => {
    setErro(null);
    setAviso(null);
    try {
      const resposta = await fetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valor),
      });
      if (!resposta.ok) {
        const data = await resposta.json().catch(() => ({}));
        throw new Error(data.message || 'Falha ao salvar a escolha.');
      }
      setPreferencia(valor);
      setAviso(valor ? `Modelo em uso: ${valor.modelo}.` : 'Voltou para a ordem padrão.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const nomePreferido = providers.find((p) => p.id === preferencia?.providerId)?.nome;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <h2 className="text-xl font-bold text-ds-text">Provedores de IA (gratuitos)</h2>
          <p className="text-sm text-ds-subtle mt-1">
            Escolha o modelo que a IA usa primeiro. Se ele falhar, os outros provedores configurados
            assumem nesta ordem, cada um com o seu modelo padrão.
          </p>
        </div>
        <button
          onClick={testarTodos}
          disabled={progresso !== null}
          className="btn-primary btn-sm"
        >
          {progresso ? `Testando ${progresso.feitos}/${progresso.total}…` : 'Testar todos os modelos'}
        </button>
      </div>

      <div className="rounded-lg border border-ds-line bg-ds-muted p-3 text-sm flex flex-wrap items-center gap-3">
        <span className="text-ds-subtle">
          Em uso:{' '}
          <strong>
            {preferencia ? `${nomePreferido ?? preferencia.providerId} — ${preferencia.modelo}` : 'ordem padrão'}
          </strong>
        </span>
        {preferencia && (
          <button
            onClick={() => salvarPreferencia(null)}
            className="text-xs underline text-ds-subtle hover:text-ds-text"
          >
            voltar à ordem padrão
          </button>
        )}
      </div>

      {erro && (
        <p className="text-sm text-ds-danger" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="text-sm text-ds-success" role="status">
          {aviso}
        </p>
      )}

      <ul className="space-y-3">
        {providers.map((provider) => {
          const modelo = modeloDe(provider);
          const ping = pings[chave(provider.id, modelo)];
          const vivo = catalogo[provider.id];
          const opcoes = Array.from(new Set([...provider.modelos, ...(vivo?.modelos ?? []), modelo]));
          const emUso = preferencia?.providerId === provider.id && preferencia.modelo === modelo;
          const resultados = provider.modelos
            .map((m) => pings[chave(provider.id, m)])
            .filter((p): p is PingResult => Boolean(p));

          return (
            <li key={provider.id} className="border border-ds-line rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ds-primary font-mono font-bold text-ds-on-solid">
                  {provider.ordem}
                </span>
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-ds-text">{provider.nome}</p>
                  <p className="text-xs text-ds-subtle">
                    {provider.papel} · variável {provider.envVar}
                    {provider.cadastro && (
                      <>
                        {' · '}
                        <a
                          href={provider.cadastro}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-ds-text"
                        >
                          criar chave grátis
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <span className={provider.configurado ? 'badge bg-ds-success/10 text-ds-success' : 'badge-neutral'}>
                  {provider.configurado ? 'configurado' : 'sem chave'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`modelo-${provider.id}`}>
                  Modelo de {provider.nome}
                </label>
                <select
                  id={`modelo-${provider.id}`}
                  value={modelo}
                  onChange={(e) => setSelecionado((atual) => ({ ...atual, [provider.id]: e.target.value }))}
                  className="input min-h-[40px] min-w-[200px] flex-1 py-1.5 text-sm"
                >
                  {opcoes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => testarModelo(provider.id, modelo)}
                  disabled={testando.has(chave(provider.id, modelo))}
                  className="btn-secondary btn-sm"
                >
                  {testando.has(chave(provider.id, modelo)) ? 'Testando…' : 'Testar'}
                </button>
                <button
                  onClick={() => salvarPreferencia({ providerId: provider.id, modelo })}
                  disabled={!provider.configurado || emUso}
                  title={provider.configurado ? undefined : `Defina ${provider.envVar} primeiro`}
                  className="btn-primary btn-sm"
                >
                  {emUso ? 'Em uso' : 'Usar este'}
                </button>
                {provider.configurado && (
                  <button
                    onClick={() => verCatalogo(provider.id)}
                    className="text-xs underline text-ds-subtle hover:text-ds-text"
                  >
                    ver todos os modelos grátis
                  </button>
                )}
              </div>

              {vivo && (
                <p className={`text-xs ${vivo.erro ? 'text-ds-danger' : 'text-ds-subtle'}`}>
                  {vivo.erro ?? `${vivo.modelos.length} modelos grátis no catálogo atual — escolha na lista acima.`}
                </p>
              )}

              {ping && (
                <p className={`text-sm ${ping.ok ? 'text-ds-success' : 'text-ds-danger'}`} role="status">
                  {ping.ok
                    ? `✅ ${ping.modeloUsado} respondeu em ${ping.latenciaMs} ms ("${ping.resposta}")`
                    : `❌ ${ping.modeloUsado}: ${ping.erro}`}
                </p>
              )}

              {resultados.length > 1 && (
                <ul className="text-xs space-y-0.5">
                  {resultados.map((r) => (
                    <li key={r.modeloUsado} className={r.ok ? 'text-ds-success' : 'text-ds-danger'}>
                      {r.ok ? '✅' : '❌'} {r.modeloUsado} —{' '}
                      {r.ok ? `${r.latenciaMs} ms` : r.erro}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
