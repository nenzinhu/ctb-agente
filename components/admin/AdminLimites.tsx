'use client';

import { useCallback, useEffect, useState } from 'react';

interface LimitesResponse {
  settings: { consultas_por_hora: number; turnstile_ativo: boolean };
  ipBloqueados: string[];
  turnstileConfigurado: boolean;
  siteKeyConfigurada: boolean;
}

/**
 * Rate limit, bot protection and IP exception controls
 */
export default function AdminLimites() {
  const [dados, setDados] = useState<LimitesResponse | null>(null);
  const [limite, setLimite] = useState(30);
  const [turnstile, setTurnstile] = useState(true);
  const [novoIp, setNovoIp] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/limites');
      if (!resposta.ok) throw new Error('Falha ao carregar limites.');
      const data = (await resposta.json()) as LimitesResponse;
      setDados(data);
      setLimite(data.settings.consultas_por_hora);
      setTurnstile(data.settings.turnstile_ativo);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch('/api/admin/limites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultas_por_hora: limite, turnstile_ativo: turnstile }),
      });
      if (!resposta.ok) throw new Error('Falha ao salvar limites.');
      setMensagem('Limites atualizados. A mudança vale em até 30 segundos.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const bloquear = async () => {
    if (!novoIp.trim()) return;
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await fetch('/api/admin/limites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: novoIp.trim(), motivo }),
      });
      if (!resposta.ok) throw new Error('Falha ao bloquear IP.');
      const data = (await resposta.json()) as { ipBloqueados: string[] };
      setDados((atual) => (atual ? { ...atual, ipBloqueados: data.ipBloqueados } : atual));
      setNovoIp('');
      setMotivo('');
      setMensagem('IP bloqueado.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const desbloquear = async (ip: string) => {
    setErro(null);
    try {
      const resposta = await fetch(`/api/admin/limites?ip=${encodeURIComponent(ip)}`, {
        method: 'DELETE',
      });
      if (!resposta.ok) throw new Error('Falha ao desbloquear IP.');
      const data = (await resposta.json()) as { ipBloqueados: string[] };
      setDados((atual) => (atual ? { ...atual, ipBloqueados: data.ipBloqueados } : atual));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  if (!dados) {
    return <p className="text-ds-subtle">Carregando limites…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-6">
        <h2 className="text-xl font-bold text-ds-text">Limites de uso</h2>

        <div>
          <label htmlFor="limite" className="block text-sm font-medium text-ds-subtle mb-2">
            Consultas por IP por hora: <strong>{limite}</strong>
          </label>
          <input
            id="limite"
            type="range"
            min={1}
            max={200}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-full accent-ds-primary"
          />
          <p className="text-xs text-ds-subtle mt-1">
            Padrão da especificação: 30 consultas/IP/hora.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="turnstile"
            type="checkbox"
            checked={turnstile}
            onChange={(e) => setTurnstile(e.target.checked)}
            className="mt-1 h-4 w-4 accent-ds-primary"
          />
          <label htmlFor="turnstile" className="text-sm text-ds-subtle">
            <span className="font-medium">Turnstile ativo</span>
            <span className="block text-xs text-ds-subtle">
              {dados.turnstileConfigurado
                ? 'Secret configurada no servidor.'
                : 'TURNSTILE_SECRET_KEY ausente: a verificação é ignorada.'}{' '}
              {dados.siteKeyConfigurada
                ? 'Widget visível para os usuários.'
                : 'NEXT_PUBLIC_TURNSTILE_SITE_KEY ausente: nenhum widget é exibido.'}
            </span>
          </label>
        </div>

        {erro && (
          <p className="text-sm text-ds-danger" role="alert">
            {erro}
          </p>
        )}
        {mensagem && <p className="text-sm text-ds-success">{mensagem}</p>}

        <button
          onClick={salvar}
          disabled={salvando}
          className="btn-primary"
        >
          {salvando ? 'Salvando…' : 'Salvar limites'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-xl font-bold text-ds-text">Exceções de IP</h2>
        <p className="text-sm text-ds-subtle">
          IPs bloqueados recebem 403 e não consomem cota.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={novoIp}
            onChange={(e) => setNovoIp(e.target.value)}
            placeholder="203.0.113.10"
            className="input"
          />
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className="input"
          />
          <button
            onClick={bloquear}
            className="btn-danger"
          >
            Bloquear IP
          </button>
        </div>

        {dados.ipBloqueados.length === 0 ? (
          <p className="text-sm text-ds-subtle">Nenhum IP bloqueado.</p>
        ) : (
          <ul className="divide-y divide-ds-line">
            {dados.ipBloqueados.map((ip) => (
              <li key={ip} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono">{ip}</span>
                <button onClick={() => desbloquear(ip)} className="text-ds-primary underline">
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
