'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icone from './ui/Icone';
import styles from './splash.module.css';

const SESSION_KEY = 'ctb-pmrv-splash-v1';

/** A brief, skippable first-entry signature; never repeats during navigation. */
export default function SplashScreen() {
  const pathname = usePathname() ?? '/';
  const checked = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const finish = useCallback(() => {
    if (exitTimer.current !== null) return;
    setClosing(true);
    exitTimer.current = window.setTimeout(() => setVisible(false), 180);
  }, []);
  useEffect(() => () => { if (exitTimer.current !== null) clearTimeout(exitTimer.current); }, []);

  useEffect(() => {
    if (checked.current || pathname.startsWith('/admin')) return;
    checked.current = true;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* Still show only once for this mounted application. */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setReduced(reduce);
    setVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(finish, reduced ? 900 : 2700);
    const hide = () => { if (document.visibilityState === 'hidden') finish(); };
    document.addEventListener('visibilitychange', hide);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', hide); };
  }, [visible, reduced, finish]);

  useEffect(() => {
    if (!visible || !root.current) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const siblings = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== root.current && !['SCRIPT', 'STYLE'].includes(element.tagName));
    const states = siblings.map(element => ({ element, inert: element.inert }));
    states.forEach(({ element }) => { element.inert = true; });
    skip.current?.focus({ preventScroll: true });
    return () => {
      states.forEach(({ element, inert }) => { element.inert = inert; });
      if (previous?.isConnected && previous !== document.body) previous.focus({ preventScroll: true });
      else document.getElementById('conteudo')?.focus({ preventScroll: true });
    };
  }, [visible]);

  if (!visible) return null;
  return <div ref={root} className={styles.splash} data-reduced-motion={reduced || undefined} data-closing={closing || undefined} role="dialog" aria-modal="true" aria-labelledby="splash-title" onKeyDown={event => { if (event.key === 'Escape') finish(); if (event.key === 'Tab') { event.preventDefault(); skip.current?.focus(); } }}>
    <div className={styles.brand}>
      {/* Original supplied insignia; keep its artwork intact. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brasao-cpmrv.png" width={112} height={142} alt="Brasão da Polícia Militar Rodoviária de Santa Catarina" className={styles.crest} />
      <h1 id="splash-title">CTB <span>Agente</span></h1>
      <p>Polícia Militar Rodoviária <span>Santa Catarina</span></p>
    </div>
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.road} />
      <div className={styles.vehicle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/illustrations/viatura-pmrv.webp" width={984} height={640} alt="" decoding="async" />
        <span className={`${styles.beacon} ${styles.beaconLeft}`} />
        <span className={`${styles.beacon} ${styles.beaconRight}`} />
      </div>
      <div className={styles.reflection} />
    </div>
    <div className={styles.bottom}>
      <p>Consulta e apoio operacional</p>
      <button ref={skip} type="button" onClick={finish}>Pular abertura <Icone nome="seta" tamanho={17} /></button>
    </div>
  </div>;
}
