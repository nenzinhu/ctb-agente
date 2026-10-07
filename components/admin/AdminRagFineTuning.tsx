'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icone from '@/components/ui/Icone';

interface HealthRag {
  banco: 'ok' | 'indisponivel';
  bancoEscrita: 'ok' | 'indisponivel';
  embeddings: 'ok' | 'indisponivel';
  esquemaRag: number | null;
  avisos: string[];
}

function Estado({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={ok ? 'badge bg-ds-success/10 text-ds-success' : 'badge bg-ds-warn/10 text-ds-text'}>
      {ok ? 'Ativo' : 'Atenção'} · {children}
    </span>
  );
}

const ETAPAS = [
  ['1', 'Entender a consulta', 'Normaliza acentos, abreviações, fragmentos, erros de digitação, sinônimos e gírias.'],
  ['2', 'Encontrar fontes', 'Consulta as fichas MBFT e os POPs locais; para o CTB indexado, combina busca textual e vetorial.'],
  ['3', 'Ordenar e filtrar', 'Prioriza cobertura dos termos, códigos exatos e similaridade; remove vizinhos fracos e alternativas sem relação.'],
  ['4', 'Responder com evidência', 'Entrega a ficha ou o POP oficial e, quando usa IA, limita a redação aos trechos recuperados e citados.'],
] as const;

/** Explains the live retrieval pipeline and keeps model training distinct. */
export default function AdminRagFineTuning() {
  const [health, setHealth] = useState<HealthRag | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch('/api/health', { cache: 'no-store' })
      .then(async (resposta) => resposta.json())
      .then((dados) => ativo && setHealth(dados as HealthRag))
      .catch(() => ativo && setErro(true));
    return () => { ativo = false; };
  }, []);

  return (
    <div className="space-y-6">
      <section className="card card-pad">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-ds-primary-soft p-2 text-ds-primary-strong"><Icone nome="busca" /></span>
          <div>
            <h2 className="text-xl font-bold text-ds-text">RAG: busca com fontes oficiais</h2>
            <p className="mt-1 text-sm leading-relaxed text-ds-subtle">
              RAG significa <strong>geração aumentada por recuperação</strong>. Antes de responder, o aplicativo procura no CTB,
              no MBFT e nos POPs. A legislação continua vindo desses documentos; a IA apenas organiza e explica o conteúdo encontrado.
            </p>
          </div>
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-2">
          {ETAPAS.map(([numero, titulo, texto]) => (
            <li key={numero} className="rounded-xl border border-ds-line bg-ds-muted p-4">
              <p className="flex items-center gap-2 font-semibold text-ds-text">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ds-primary font-mono text-xs text-ds-on-solid">{numero}</span>
                {titulo}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ds-subtle">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card card-pad">
        <h2 className="text-xl font-bold text-ds-text">Estado atual do RAG</h2>
        <p className="mt-1 text-sm text-ds-subtle">Diagnóstico do ambiente publicado, sem exibir chaves ou outros segredos.</p>
        {erro ? (
          <p className="alert-error mt-4" role="alert">Não foi possível consultar o diagnóstico agora.</p>
        ) : !health ? (
          <p className="mt-4 text-sm text-ds-subtle" role="status">Verificando banco, vetores e versão do RAG…</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ds-line p-4">
              <Estado ok>Busca local</Estado>
              <p className="mt-2 font-semibold text-ds-text">411 fichas MBFT e 144 POPs</p>
              <p className="mt-1 text-sm text-ds-subtle">Funciona mesmo sem Supabase ou provedor de IA.</p>
            </div>
            <div className="rounded-xl border border-ds-line p-4">
              <Estado ok={health.banco === 'ok'}>Busca textual no banco</Estado>
              <p className="mt-2 text-sm text-ds-subtle">Recupera artigos, resoluções e documentos enviados.</p>
            </div>
            <div className="rounded-xl border border-ds-line p-4">
              <Estado ok={health.embeddings === 'ok'}>Busca semântica</Estado>
              <p className="mt-2 text-sm text-ds-subtle">Usa vetores semânticos para encontrar sentidos próximos, mesmo com palavras diferentes.</p>
            </div>
            <div className="rounded-xl border border-ds-line p-4">
              <Estado ok={(health.esquemaRag ?? 0) >= 10}>Esquema RAG {health.esquemaRag ?? 'não detectado'}</Estado>
              <p className="mt-2 text-sm text-ds-subtle">A versão 10 habilita prefixos, cobertura mínima e corte de similaridade baixa.</p>
            </div>
          </div>
        )}
        {health?.avisos?.length ? (
          <div className="alert-warn mt-4">
            <Icone nome="alerta" className="shrink-0 text-ds-warn" />
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {health.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ds-text">Ajuste fino: treinamento especializado</h2>
            <p className="mt-1 text-sm text-ds-subtle">Estado atual: <strong>nenhum modelo foi treinado por este aplicativo</strong>.</p>
          </div>
          <span className="badge-neutral">Planejamento</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-ds-line p-4">
            <h3 className="font-semibold text-ds-text">O que ele pode melhorar</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ds-subtle">
              <li>Formato, clareza e consistência das explicações.</li>
              <li>Classificação ou reordenação de consultas ambíguas, após rotulagem humana.</li>
              <li>Vocabulário operacional recorrente que não foi resolvido por sinônimos ou vetores semânticos.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-ds-line p-4">
            <h3 className="font-semibold text-ds-text">O que ele não substitui</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ds-subtle">
              <li>CTB, MBFT, resoluções e POPs atualizados no RAG.</li>
              <li>Citações verificáveis e revisão jurídica ou operacional.</li>
              <li>Perguntas de esclarecimento quando faltam fatos da ocorrência.</li>
            </ul>
          </div>
        </div>

        <h3 className="mt-5 font-semibold text-ds-text">Quando ficará seguro experimentar</h3>
        <ol className="mt-3 space-y-2 text-sm text-ds-subtle">
          {[
            'Coletar consultas reais sem placa, CPF, CNH ou outros dados pessoais.',
            'Rotular a ficha, artigo ou POP correto e registrar casos que realmente são ambíguos.',
            'Separar treino, validação e teste por documento, evitando perguntas quase iguais nos dois lados.',
            'Comparar o modelo com o RAG atual usando Hit@1, Hit@3, falsos positivos, citações e latência.',
            'Publicar somente se superar a referência sem inventar códigos, artigos ou procedimentos.',
          ].map((passo, indice) => (
            <li key={passo} className="flex gap-3 rounded-lg bg-ds-muted p-3">
              <strong className="font-mono text-ds-primary-strong">{indice + 1}.</strong><span>{passo}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card card-pad">
        <h2 className="text-lg font-bold text-ds-text">O que usar agora</h2>
        <p className="mt-1 text-sm text-ds-subtle">
          Para melhorar a precisão hoje, priorize documentos corretos, migração 010, representações vetoriais e retorno das consultas. O ajuste fino entra depois que houver dados revisados suficientes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/consulta" className="btn-secondary btn-sm">Testar CTB/MBFT</Link>
          <Link href="/pop" className="btn-secondary btn-sm">Testar POP</Link>
          <Link href="/professor" className="btn-secondary btn-sm">Testar Professor Emérito</Link>
        </div>
      </section>
    </div>
  );
}
