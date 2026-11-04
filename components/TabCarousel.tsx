'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Scroll only the tab strip; arrows never change the selected page. */
export default function TabCarousel({ children, activeKey, tablist = false }: {
  children: ReactNode; activeKey: string; tablist?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const measure = () => {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reveal = () => {
      const active = el.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]');
      if (active) {
        const box = active.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        if (box.left < bounds.left) el.scrollLeft -= bounds.left - box.left;
        else if (box.right > bounds.right) el.scrollLeft += box.right - bounds.right;
      }
      measure();
    };
    reveal();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reveal);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeKey]);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <div className="pmrv-tab-carousel">
    <button type="button" className="pmrv-tab-arrow" aria-label="Ver abas anteriores" disabled={edges.start} onClick={() => move(-1)}><span className="pmrv-chevron pmrv-chevron-back" aria-hidden="true" /></button>
    <div ref={track} className="pmrv-tab-track" onScroll={measure} role={tablist ? 'tablist' : undefined} aria-label={tablist ? 'Áreas do painel' : undefined}>{children}</div>
    <button type="button" className="pmrv-tab-arrow" aria-label="Ver próximas abas" disabled={edges.end} onClick={() => move(1)}><span className="pmrv-chevron" aria-hidden="true" /></button>
  </div>;
}
