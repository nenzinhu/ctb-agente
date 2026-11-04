'use client';
import { useState } from 'react';
import RecentQueries from './RecentQueries';
import ConsultaForm from './ConsultaForm';
import ReadingModeToggle from './ReadingModeToggle';
import NavTabs from './NavTabs';
import Icone from './ui/Icone';
import styles from '@/app/home.module.css';

/** Each tab now opens the real route; the shared shell stays mounted. */
export default function HomeDashboard() {
  const [ajuda, setAjuda] = useState(false);
  return <main className={styles.dashboard} aria-label="Painel CTB Agente">
    <div className={styles.workspace}>
      <div className={styles.heading}><div><h1>Consultar CTB</h1><p>CTB e MBFT · Código, artigo ou situação</p></div><button type="button" className={styles.help} aria-label={ajuda ? 'Voltar à consulta' : 'Como pesquisar'} aria-pressed={ajuda} onClick={() => setAjuda(!ajuda)}><Icone nome={ajuda ? 'voltar' : 'info'} tamanho={21} /></button></div>
      <ReadingModeToggle panel />
      <section className={styles.panel} aria-label="Pesquisa CTB">
        <div className={styles.content}>
          <div hidden={ajuda} className={styles.search}><ConsultaForm /></div>
          {ajuda && <div className={styles.guide}><h2>Como pesquisar</h2><p><strong>Código ou artigo</strong><br />Digite 516-91 ou art. 165.</p><p><strong>Uma situação</strong><br />Descreva a conduta: motorista mexendo no celular.</p><p><strong>Não lembra a palavra?</strong><br />Tente “estacion” ou “bafomet”.</p><button type="button" className="btn-primary" onClick={() => setAjuda(false)}>Voltar à consulta</button></div>}
        </div>
        {!ajuda && <details className={styles.recent}><summary>Retomar consulta anterior</summary><RecentQueries /></details>}
      </section>
      <p className={styles.disclaimer}>Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.</p>
    </div>
    <div className={styles.tabs}><NavTabs /></div>
  </main>;
}
