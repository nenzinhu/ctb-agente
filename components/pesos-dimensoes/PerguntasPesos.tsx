'use client';

import { useState } from 'react';

import Field from '@/components/ui/Field';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SectionCard from '@/components/ui/SectionCard';
import type { RespostaPeso } from '@/lib/pesos-dimensoes/rag';

export default function PerguntasPesos() {
  const [consulta, setConsulta] = useState('');
  const [resposta, setResposta] = useState<RespostaPeso | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (consulta.trim().length < 3 || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch('/api/pesos-dimensoes/perguntar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consulta: consulta.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Não foi possível consultar as fontes.');
      setResposta(body as RespostaPeso);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível consultar as fontes.');
      setResposta(null);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SectionCard titulo="Tire uma dúvida nas fontes oficiais" icone="professor">
      <form onSubmit={enviar} className="space-y-4">
        <Field
          as="textarea"
          label="Dúvida sobre pesos e dimensões"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          rows={3}
          minLength={3}
          maxLength={500}
          placeholder="Ex: Nota fiscal sem peso em kg: como proceder?"
          hint="A resposta usa a Resolução CONTRAN nº 882/2021 e as fichas do MBFT. Não informe dados pessoais."
          erro={erro}
        />
        <PrimaryButton type="submit" icone="busca" carregando={carregando} textoCarregando="Consultando…" disabled={consulta.trim().length < 3} className="min-h-12 w-full sm:w-auto">
          Consultar fontes
        </PrimaryButton>
      </form>
      {resposta && (
        <div className="mt-5 border-t border-ds-line pt-5" aria-live="polite">
          <span className="badge-brand">{resposta.origem === 'ia' ? 'Explicação por IA' : 'Trechos oficiais'}</span>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{resposta.resposta}</p>
          <h3 className="mt-4 text-sm font-semibold">Fontes</h3>
          <ul className="mt-2 space-y-1 text-xs text-ds-subtle">
            {resposta.fontes.map((fonte) => <li key={fonte.id}>{fonte.documento} · {fonte.referencia} · p. {fonte.pagina}</li>)}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
