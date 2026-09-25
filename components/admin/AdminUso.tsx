'use client';

import { useCallback, useEffect, useState } from 'react';

interface UsoDia {
  dia: string;
  consultas: number;
  cacheHits: number;
  falhas: number;
}

interface UsoResponse {
  janelaDias: number;
  porDia: UsoDia[];
  total: number;
  cacheHits: number;
  falhas: number;
  taxaCache: number;
  perguntasSemResposta: { pergunta: string; timestamp: string }[];
  provedoresComFalha: { modelo: string; falhas: number }[];
  cache: { total: number; validas: number; expiradas: number; ultimoAcesso: string | null };
}

/**
 * Usage report: volume, cache efficiency and the gaps in the corpus
 */
export default function AdminUso() {
  const [dados, setDados] = useState<UsoResponse | null>(null);
  const [janela, setJanela] = useState(30);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/admin/uso?dias=${janela}`);
      if (!resposta.ok) throw new Error('Falha ao carregar estatísticas.');
      setDados((await resposta.json()) as UsoResponse);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, [janela]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const maiorDia = Math.max(1, ...(dados?.porDia.map((d) => d.consultas) ?? [1]));

  if (carregando && !dados) {
    return <p className="text-muted">Carregando estatísticas…</p>;
  }

  if (erro) {
    return (
      <p className="text-danger" role="alert">
        {erro}
      </p>
    );
  }

  if (!dados) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-ink">Uso</h2>
        <select
          value={janela}
          onChange={(e) => setJanela(Number(e.target.value))}
          className="px-3 py-1 border border-line rounded-lg text-sm"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile titulo="Consultas" valor={String(dados.total)} />
        <Tile titulo="Cache hit" valor={`${dados.taxaCache}%`} />
        <Tile titulo="Falhas" valor={String(dados.falhas)} />
        <Tile
          titulo="Entradas em cache"
          valor={`${dados.cache.validas}/${dados.cache.total}`}
        />
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-ink mb-4">Consultas por dia</h3>
        {dados.porDia.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma consulta registrada nesta janela.</p>
        ) : (
          <ul className="space-y-2">
            {dados.porDia.map((dia) => (
              <li key={dia.dia} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-mono text-muted">{dia.dia}</span>
                <span
                  className="h-4 rounded bg-brand"
                  style={{ width: `${Math.max(4, (dia.consultas / maiorDia) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="text-muted">
                  {dia.consultas} consultas · {dia.cacheHits} do cache
                  {dia.falhas > 0 ? ` · ${dia.falhas} falhas` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-ink mb-2">Perguntas sem resposta</h3>
          <p className="text-xs text-muted mb-4">
            Lacunas da base: perguntas que não retornaram resultado relevante.
          </p>
          {dados.perguntasSemResposta.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma lacuna registrada. 🎉</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dados.perguntasSemResposta.map((item, idx) => (
                <li key={`${item.pergunta}-${idx}`} className="border-l-2 border-amber-400 pl-3">
                  <p className="text-ink">{item.pergunta}</p>
                  <p className="text-xs text-muted">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-ink mb-2">Falhas por recurso</h3>
          <p className="text-xs text-muted mb-4">
            Onde a resposta falhou (provedor de IA, banco ou renderização).
          </p>
          {dados.provedoresComFalha.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma falha registrada.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dados.provedoresComFalha.map((item) => (
                <li key={item.modelo} className="flex justify-between">
                  <span className="text-ink">{item.modelo}</span>
                  <span className="font-semibold text-danger">{item.falhas}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Small metric tile
 * @param props - Title and formatted value
 */
function Tile({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="text-2xl font-bold text-ink mt-1">{valor}</p>
    </div>
  );
}
