'use client';

import { useEffect, useState } from 'react';
import Icone from '@/components/ui/Icone';

interface AuditItem {
  codigo: string;
  fichaEncontrada: boolean;
  exemploSeed: boolean;
  divergencias: { campo: string; banco: string | number; mbft: string | number }[];
  revisaoHumana: string[];
}

interface AuditResponse {
  corpus: { documentos: number; trechos: number; vetoresPendentes: number; ctbIndexado: boolean };
  enquadramentos: { totalBanco: number; totalMbft: number; duplicados: string[]; itens: AuditItem[] };
}

const CAMPO: Record<string, string> = {
  descricao: 'Descrição', gravidade: 'Gravidade', pontos: 'Pontos', amparo_legal: 'Amparo legal',
  valor_multa: 'Valor da multa',
};

export default function AdminCorpusAudit() {
  const [dados, setDados] = useState<AuditResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'divergentes' | 'sem_ficha' | 'seed'>('todos');

  useEffect(() => {
    let ativo = true;
    fetch('/api/admin/corpus-audit', { cache: 'no-store' })
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error();
        return resposta.json();
      })
      .then((resultado) => ativo && setDados(resultado as AuditResponse))
      .catch(() => ativo && setErro('Não foi possível revisar a base agora.'));
    return () => { ativo = false; };
  }, []);

  if (erro) return <div className="alert-error" role="alert"><Icone nome="alerta" /><p>{erro}</p></div>;
  if (!dados) return <div className="skeleton h-36" role="status"><span className="sr-only">Revisando base…</span></div>;

  const itens = dados.enquadramentos.itens.filter((item) => {
    if (filtro === 'divergentes') return item.divergencias.length > 0;
    if (filtro === 'sem_ficha') return !item.fichaEncontrada;
    if (filtro === 'seed') return item.exemploSeed;
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="stat bg-ds-surface"><p className="stat-label">Base CTB</p><p className="stat-value text-base">{dados.corpus.ctbIndexado ? 'CTB indexado' : 'CTB não indexado'}</p></div>
        <div className="stat bg-ds-surface"><p className="stat-label">Conteúdo</p><p className="stat-value">{dados.corpus.trechos.toLocaleString('pt-BR')}</p><p className="text-xs text-ds-subtle">trechos em {dados.corpus.documentos} documento(s)</p></div>
        <div className="stat bg-ds-surface"><p className="stat-label">Vetores</p><p className="stat-value">{dados.corpus.vetoresPendentes}</p><p className="text-xs text-ds-subtle">{dados.corpus.vetoresPendentes} trechos sem vetor</p></div>
      </section>

      <section className="card card-pad">
        <h2 className="text-xl font-bold text-ds-text">Revisão dos enquadramentos</h2>
        <p className="mt-1 text-sm text-ds-subtle">Compara {dados.enquadramentos.totalBanco} registro(s) do banco com {dados.enquadramentos.totalMbft} fichas MBFT. Nada é alterado automaticamente.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['todos', 'Todos'], ['divergentes', 'Divergentes'], ['sem_ficha', 'Sem ficha'], ['seed', 'Exemplos do seed']] as const).map(([id, label]) => (
            <button key={id} type="button" className={filtro === id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setFiltro(id)}>{label}</button>
          ))}
        </div>
        {dados.enquadramentos.duplicados.length > 0 && <p className="alert-warn mt-4">Códigos duplicados: {dados.enquadramentos.duplicados.join(', ')}</p>}
        <ul className="mt-4 space-y-3">
          {itens.map((item, index) => (
            <li key={`${item.codigo}-${index}`} className="rounded-control border border-ds-line p-4">
              <div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-ds-text">{item.codigo}</strong>{item.exemploSeed && <span className="badge-neutral">Exemplo do seed</span>}{!item.fichaEncontrada && <span className="badge bg-ds-warn/10 text-ds-warn">Sem ficha MBFT</span>}</div>
              {item.divergencias.map((d) => <p key={d.campo} className="mt-2 text-sm text-ds-subtle"><strong>{CAMPO[d.campo] ?? d.campo}:</strong> banco “{d.banco}” · MBFT “{d.mbft}”</p>)}
              {item.revisaoHumana.map((campo) => <p key={campo} className="mt-2 text-sm text-ds-warn">{CAMPO[campo] ?? campo}: revisão humana necessária.</p>)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
