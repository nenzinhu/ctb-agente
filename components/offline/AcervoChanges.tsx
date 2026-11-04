'use client';
import {useEffect,useMemo,useState} from 'react';
import {lerPacote} from '@/lib/offline/store';
import {compararPacotes} from '@/lib/offline/diff';
import type {PacoteSalvo} from '@/lib/offline/model';
export default function AcervoChanges(){
 const [pacotes,setPacotes]=useState<[PacoteSalvo|null,PacoteSalvo|null]|null>(null),[erro,setErro]=useState(''),[filtro,setFiltro]=useState(''),[limite,setLimite]=useState(20);
 useEffect(()=>{let ativo=true;Promise.all([lerPacote('anterior'),lerPacote('atual')]).then(p=>{if(ativo)setPacotes(p)}).catch(e=>{if(ativo)setErro(e instanceof Error?e.message:'Não foi possível ler as versões.')});return()=>{ativo=false}},[]);
 const diferencas=useMemo(()=>pacotes?.[0]&&pacotes[1]?compararPacotes(pacotes[0].pacote,pacotes[1].pacote):[],[pacotes]);
 const visiveis=diferencas.filter(d=>!filtro||d.status===filtro);
 return <section className="card card-pad" aria-label="Comparação de versões do acervo"><h2 className="text-lg font-semibold">O que mudou no texto baixado</h2><p className="mt-2 text-sm text-ds-subtle">Comparação local de conteúdo entre dois downloads diferentes. Inclusões, exclusões ou diferenças textuais não confirmam alteração legal, vigência ou revisão jurídica.</p>
 {erro?<p role="alert" className="field-error mt-3">{erro}</p>:!pacotes?<p role="status" className="mt-3">Conferindo versões…</p>:!pacotes[0]||!pacotes[1]?<p className="mt-3">Ainda não há duas versões diferentes neste aparelho. Ao atualizar o pacote, a versão anterior é preservada para comparação. Baixar novamente a mesma versão não cria alterações.</p>:<><p className="mt-3 text-sm">Anterior: {pacotes[0].pacote.versao} · atual: {pacotes[1].pacote.versao}</p><p role="status" className="mt-2 text-sm">{diferencas.length} documento(s) com diferença de conteúdo.</p><label className="mt-4 block text-sm">Mostrar<select className="field mt-1 w-full" value={filtro} onChange={e=>{setFiltro(e.target.value);setLimite(20)}}><option value="">Todas as diferenças</option><option value="incluído">Incluídos</option><option value="alterado">Alterados</option><option value="removido">Removidos</option></select></label>
 {visiveis.slice(0,limite).map(d=><details key={`${d.tipo}:${d.id}`} className="support-details mt-3"><summary>{d.tipo} {d.id} · {d.status}</summary><p className="my-2 font-semibold">{d.titulo}</p><div className="grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">Antes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{d.antes||'Ausente no pacote anterior'}</p></div><div><h3 className="font-semibold">Depois</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{d.depois||'Ausente no pacote atual'}</p></div></div></details>)}{visiveis.length>limite&&<button type="button" className="btn-secondary mt-4" onClick={()=>setLimite(n=>n+20)}>Mostrar mais diferenças</button>}</>}
 </section>;
}
