'use client';
import { useEffect, useMemo, useState } from 'react';
import Field from '@/components/ui/Field';
import { requestJson } from '@/lib/client/request';
import { buscarOffline, type PacoteOffline, type PacoteSalvo } from '@/lib/offline/model';
import { lerPacote, salvarPacote, removerPacotes } from '@/lib/offline/store';
import { CompareFichaButton } from '@/components/comparison/ComparisonProvider';
import TextoReferenciasCtb from '@/components/TextoReferenciasCtb';

export default function OfflineAcervo() {
  const [salvo, setSalvo] = useState<PacoteSalvo | null>(null), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
  const [query, setQuery] = useState(''), [consulta, setConsulta] = useState(''), [limite, setLimite] = useState(10);
  useEffect(() => { let active = true; lerPacote().then(p => { if (active) setSalvo(p); }).catch(e => { if (active) setErro(e.message); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  const baixar = async () => {
    if (busy) return;
    setBusy(true); setErro(''); setAviso('');
    try {
      const pacote = await requestJson<PacoteOffline>('/api/offline/pacote', { cache: 'no-store' }, 45_000);
      const registro = await salvarPacote(pacote);
      setSalvo(registro); setAviso('Pacote salvo neste aparelho. Você pode consultar sem conexão.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível baixar o pacote.'); }
    finally { setBusy(false); }
  };
  const resultados = useMemo(() => salvo ? buscarOffline(salvo.pacote, consulta) : { artigos: [], fichas: [], pops: [] }, [salvo, consulta]);
  const total = resultados.artigos.length + resultados.fichas.length + resultados.pops.length;
  return <div className="space-y-5">
    <section className="card card-pad" aria-label="Pacote offline">
      <h2 className="text-lg font-semibold">Acervo neste aparelho</h2>
      <p className="mt-2 text-sm text-ds-subtle">Baixe o CTB, as fichas MBFT e o manual de POPs públicos incluídos no aplicativo. Documentos enviados ao painel administrativo não entram automaticamente neste pacote.</p>
      {!ready && <p role="status" className="mt-3">Conferindo o armazenamento…</p>}
      {salvo && <div className="mt-3 text-sm"><p>Versão {salvo.pacote.versao} · baixada em {new Date(salvo.baixadoEm).toLocaleString('pt-BR')}</p><p>{salvo.pacote.artigos.length} artigos · {salvo.pacote.fichas.length} fichas · {salvo.pacote.pops.length} POPs</p></div>}
      <p className="mt-3 text-sm font-medium">Uma cópia offline não confirma vigência. Confira as alterações na fonte oficial antes de atuar.</p>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={!ready || busy} aria-busy={busy} onClick={() => void baixar()}>{busy ? 'Baixando pacote…' : salvo ? 'Atualizar pacote offline' : 'Baixar pacote offline'}</button>
      {salvo && <button type="button" className="btn-ghost" disabled={busy} onClick={async () => { try { await removerPacotes(); setSalvo(null); setConsulta(''); setAviso('Pacote removido deste aparelho.'); } catch(e) { setErro(e instanceof Error ? e.message : 'Não foi possível remover.'); } }}>Remover pacote</button>}</div>
      {erro && <p role="alert" className="field-error mt-3">{erro}</p>}{aviso && <p role="status" className="mt-3 text-sm">{aviso}</p>}
    </section>
    {salvo && <section className="card card-pad" aria-label="Consulta offline"><h2 className="text-lg font-semibold">Consultar o pacote baixado</h2><p className="mt-2 text-sm text-ds-subtle">Busca local, sem IA e sem envio da pergunta ao servidor. Escolha e confira o documento correspondente.</p>
      <form noValidate className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); setConsulta(query.trim()); setLimite(10); }}><Field label="Pesquisar no acervo offline" value={query} onChange={e => setQuery(e.target.value)} maxLength={300} placeholder="Ex.: art. 165, 516-91 ou POP 003" onClear={() => { setQuery(''); setConsulta(''); }} /><button type="submit" className="btn-primary" disabled={!query.trim()}>Consultar offline</button></form>
      {consulta && <><p role="status" className="mt-5 text-sm">{total ? `${total} resultado(s) no pacote ${salvo.pacote.versao}` : 'Nenhum resultado no pacote. Tente outro termo ou confira a fonte quando estiver conectado.'}</p>
        {resultados.artigos.slice(0, limite).map(a => <details key={a.numero} className="support-details mt-3"><summary>Art. {a.numero} do CTB — cópia local</summary><p className="whitespace-pre-wrap leading-relaxed">{a.texto}</p><p className="mt-3 text-sm text-ds-subtle">{a.aviso}</p><a href={a.fonte} target="_blank" rel="noopener noreferrer" className="text-ds-ink underline">Fonte oficial (requer conexão)</a></details>)}
        {resultados.fichas.slice(0, limite).map(f => <details key={f.codigo} className="support-details mt-3"><summary>{f.codigo} · {f.tipificacaoResumida}</summary><CompareFichaButton ficha={f} /><p><TextoReferenciasCtb texto={f.amparoLegal} contextoCtb /></p><dl className="mt-3 space-y-3">{[['Gravidade',f.gravidade],['Pontuação',f.pontuacao],['Penalidade',f.penalidade],['Medida administrativa',f.medidaAdministrativa],['Constatação',f.constatacao],['Infrator',f.infrator],['Competência',f.competencia],['Configuração de crime',f.configuraCrime],['Exemplos',f.exemplos?.join('\n')],['Quando autuar',f.quandoAutuar.join('\n')],['Quando não autuar',f.quandoNaoAutuar.join('\n')],['Definições',f.definicoes?.join('\n')],['Informações complementares',f.informacoesComplementares?.join('\n')]].map(([label,texto]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap text-sm">{texto || 'Não informado no acervo'}</dd></div>)}</dl><p className="mt-3 text-xs">MBFT incluído no app · página {f.pagina} · confira vigência.</p></details>)}
        {resultados.pops.slice(0, limite).map(p => <details key={p.numero} className="support-details mt-3"><summary>POP {p.numero} · {p.titulo}</summary><p className="text-xs">Manual incluído no app · atualização indicada no documento: {p.atualizado || 'não informada'} · página {p.pagina}.</p><h3 className="mt-4 font-semibold">Fundamentação do documento</h3><ul className="list-disc pl-5 text-sm">{p.fundamentacao.map((f,i) => <li key={i}>{f.norma} {f.especificacao}</li>)}</ul>{[['Sequência das ações',p.sequencia],['Atividades críticas',p.atividadesCriticas],['Erros a evitar',p.errosEvitar],['Material',p.material],['Anexos',p.anexos]].map(([label,itens]) => <div key={String(label)} className="mt-4"><h3 className="font-semibold">{String(label)}</h3><ul className="list-disc space-y-2 pl-5 text-sm">{(itens as typeof p.sequencia)?.map((i,j) => <li key={j}>{i.texto}</li>)}</ul></div>)}</details>)}
        {Math.max(resultados.artigos.length,resultados.fichas.length,resultados.pops.length) > limite && <button type="button" className="btn-secondary mt-4" onClick={() => setLimite(n => n + 10)}>Mostrar mais resultados</button>}</>}
    </section>}
  </div>;
}
