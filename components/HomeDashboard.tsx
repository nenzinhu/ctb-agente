'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ConsultaForm from './ConsultaForm';
import FloatingPageArrows from './FloatingPageArrows';
import Icone, { type NomeIcone } from './ui/Icone';
import { GRUPOS_FERRAMENTAS } from '@/lib/navigation';
import { getFavorites, type CartaoFavorito } from '@/lib/favorites/favorites';
import { getRecentQueries } from '@/lib/search/local-storage';
import styles from '@/app/home.module.css';

const ABAS = [
  { id: 'consulta', label: 'Consultar', icone: 'busca' },
  { id: 'pop', label: 'POPs', icone: 'escudo' },
  { id: 'salvos', label: 'Salvos', icone: 'estrela' },
  { id: 'ferramentas', label: 'Ferramentas', icone: 'lista' },
] satisfies { id: string; label: string; icone: NomeIcone }[];

export default function HomeDashboard() {
  const [aba, setAba] = useState('consulta');
  const [pagina, setPagina] = useState(0);
  const [favoritos, setFavoritos] = useState<CartaoFavorito[]>([]);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [ajuda, setAjuda] = useState(false);
  useEffect(() => { setFavoritos(getFavorites()); setRecentes(getRecentQueries()); }, [aba]);
  const ferramentas = GRUPOS_FERRAMENTAS.flatMap(grupo => grupo.itens);
  const lista = aba === 'salvos' ? favoritos : ferramentas;
  const paginas = Math.max(1, Math.ceil(lista.length / 2));
  const mudarAba = (id: string) => { setAba(id); setPagina(0); setAjuda(false); };

  return (
    <main className={styles.dashboard} aria-label="Painel CTB Agente">
      <div className={styles.workspace}>
        <div className={styles.heading}>
          <div>
            <h1>{aba === 'consulta' ? 'Consultar infrações e artigos' : aba === 'pop' ? 'Procedimentos operacionais' : aba === 'salvos' ? 'Seus favoritos' : 'Ferramentas de apoio'}</h1>
            <p>{aba === 'consulta' ? 'CTB e MBFT · Código, artigo ou situação' : aba === 'pop' ? 'POPs da Polícia Militar de Santa Catarina' : aba === 'salvos' ? 'Cartões guardados somente neste aparelho' : 'Escolha a tarefa que precisa realizar'}</p>
          </div>
          {aba === 'consulta' && <button type="button" className={styles.help} aria-label={ajuda ? 'Voltar à consulta' : 'Como pesquisar'} aria-pressed={ajuda} onClick={() => setAjuda(!ajuda)}><Icone nome={ajuda ? 'voltar' : 'info'} tamanho={21} /></button>}
        </div>

        <section id="painel-inicial" role="tabpanel" aria-labelledby={`aba-${aba}`} className={styles.panel} tabIndex={0}>
          <div className={styles.content}>
            <div hidden={aba !== 'consulta' || ajuda} className={styles.search}>
              <ConsultaForm />
              <div className={styles.quick} aria-label="Consultas rápidas">
                {['516-91', 'art. 165', 'moto sem capacete'].map(texto => <Link key={texto} href={`/consulta?q=${encodeURIComponent(texto)}`}>{texto}<Icone nome="seta" tamanho={14} /></Link>)}
              </div>
            </div>
            {aba === 'consulta' && ajuda && <div className={styles.guide}>
              <Icone nome="livro" tamanho={30} />
              <h2>Como pesquisar</h2>
              <p><strong>Código ou artigo</strong><br />Digite 516-91 ou art. 165.</p>
              <p><strong>Uma situação</strong><br />Descreva a conduta: motorista mexendo no celular.</p>
              <p><strong>Não lembra a palavra?</strong><br />Tente “estacion” ou “bafomet”.</p>
              <button className="btn-primary" onClick={() => setAjuda(false)}>Voltar à consulta</button>
            </div>}
            {aba === 'pop' && <div className={styles.guide}>
              <span className={styles.symbol}><Icone nome="escudo" tamanho={32} /></span>
              <h2>Encontre o procedimento certo</h2>
              <p>Consulte pelo número do POP, pelo nome ou pela situação. Confira a fonte antes da atuação.</p>
              <Link href="/pop" className="btn-primary">Consultar POPs <Icone nome="seta" tamanho={18} /></Link>
              <Link href="/casos" className={styles.row}><Icone nome="check" tamanho={21} /><span>Casos práticos<small>Situações e procedimentos de fiscalização</small></span><Icone nome="seta" tamanho={18} /></Link>
            </div>}
            {aba === 'salvos' && (favoritos.length ? <div className={styles.list}>{favoritos.slice(pagina * 2, pagina * 2 + 2).map(({ id, card }) => <Link key={id} className={styles.row} href={`/consulta?q=${encodeURIComponent(card.consulta)}`}><Icone nome="estrela" tamanho={20} /><span>{card.fichas_mbft?.[0]?.tipificacaoResumida || card.enquadramento?.descricao || card.consulta}<small>{card.enquadramento?.codigo_mbft || card.consulta}</small></span><Icone nome="seta" tamanho={18} /></Link>)}</div> : <div className={styles.guide}><span className={styles.symbol}><Icone nome="estrela" tamanho={32} /></span><h2>Nenhum favorito ainda</h2><p>Toque em “Salvar” no cartão de uma consulta para encontrá-lo aqui depois.</p><button className="btn-primary" onClick={() => mudarAba('consulta')}>Fazer uma consulta</button></div>)}
            {aba === 'ferramentas' && <div className={styles.list}>{ferramentas.slice(pagina * 2, pagina * 2 + 2).map(item => <Link key={item.href} href={item.href} className={styles.row}><Icone nome={item.icone} tamanho={24} /><span>{item.label}<small>{item.descricao}</small></span><Icone nome="seta" tamanho={18} /></Link>)}</div>}
          </div>
          {(aba === 'salvos' || aba === 'ferramentas') && paginas > 1 && <div className={styles.pagination} aria-label="Paginação"><button aria-label="Página anterior" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}><Icone nome="voltar" tamanho={18} /></button><span aria-live="polite">{pagina + 1} de {paginas}</span><button aria-label="Próxima página" disabled={pagina === paginas - 1} onClick={() => setPagina(pagina + 1)}><Icone nome="seta" tamanho={18} /></button></div>}
          {aba === 'consulta' && !ajuda && <div className={styles.recent}><span>Recente</span>{recentes.length ? <Link href={`/consulta?q=${encodeURIComponent(recentes[0])}`}>{recentes[0]} <Icone nome="seta" tamanho={14} /></Link> : <span>Nenhum código consultado</span>}</div>}
        </section>
        <p className={styles.disclaimer}>Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.</p>
      </div>
      <FloatingPageArrows
        previousLabel="Voltar à aba anterior" nextLabel="Avançar à próxima aba"
        previousDisabled={aba === ABAS[0].id} nextDisabled={aba === ABAS[ABAS.length - 1].id}
        onPrevious={() => mudarAba(ABAS[Math.max(0, ABAS.findIndex(item => item.id === aba) - 1)].id)}
        onNext={() => mudarAba(ABAS[Math.min(ABAS.length - 1, ABAS.findIndex(item => item.id === aba) + 1)].id)}
      />
      <nav className={styles.tabs} role="tablist" aria-label="Áreas do painel">
        {ABAS.map((item, index) => <button key={item.id} id={`aba-${item.id}`} type="button" role="tab" aria-selected={aba === item.id} aria-controls="painel-inicial" tabIndex={aba === item.id ? 0 : -1} onClick={() => mudarAba(item.id)} onKeyDown={e => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length; mudarAba(ABAS[next].id); document.getElementById(`aba-${ABAS[next].id}`)?.focus(); } }}><Icone nome={item.icone} tamanho={22} /><span>{item.label}</span></button>)}
      </nav>
    </main>
  );
}
