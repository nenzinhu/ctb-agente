'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import FloatingPageArrows from './FloatingPageArrows';
import ReadingModeToggle from './ReadingModeToggle';
import { useScrollReading } from '@/lib/client/reading-mode';

/** CSS columns fragment the original DOM rather than cloning forms or cutting
 * screenshots. Inputs, React state and links remain the same across pages. */
function PaginatedContent({ children, scroll }: { children: ReactNode; scroll: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [section, setSection] = useState('');
  const [sections, setSections] = useState<{ label: string; page: number }[]>([]);
  const current = useRef(0);
  const count = useRef(1);

  const navigate = useCallback((requested: number) => {
    const container = frame.current;
    if (!container) return;
    const next = Math.max(0, Math.min(requested, count.current - 1));
    current.current = next;
    setPage(next);
    if (scroll) {
      container.scrollLeft = 0;
      container.scrollTop = next * container.clientHeight;
    } else {
      container.scrollLeft = next * (container.clientWidth + 32);
      container.scrollTop = 0;
    }
    const heading = [...(flow.current?.querySelectorAll<HTMLElement>('h1,h2,h3') ?? [])].find(el => {
      const rect = el.getBoundingClientRect();
      const bounds = container.getBoundingClientRect();
      return rect.width && rect.left >= bounds.left - 1 && rect.left < bounds.right;
    });
    setSection(heading?.textContent ?? 'Continuação');
  }, [scroll]);

  useEffect(() => {
    const container = frame.current;
    const content = flow.current;
    if (!container || !content) return;
    let raf = 0;
    let disposed = false;
    current.current = 0;
    container.scrollTop = 0;
    container.scrollLeft = 0;
    content.querySelectorAll('[data-page-flow]').forEach(el => el.removeAttribute('data-page-flow'));
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (disposed) return;
        const height = container.clientHeight;
        // Chromium treats flex/grid formatting contexts as unfragmentable.
        // Convert only oversized groups to normal flow; compact controls keep
        // their authored layout, including vehicle choices and action rows.
        if (!scroll) for (const element of content.querySelectorAll<HTMLElement>('div,section,article,aside,form,fieldset,ul,ol')) {
          if (element.hasAttribute('data-page-flow')) continue;
          const style = getComputedStyle(element);
          if (/^(inline-)?(grid|flex)$/.test(style.display) && element.getBoundingClientRect().height > height - 8) {
            element.setAttribute('data-page-flow', '');
          }
        }
        const total = scroll ? Math.max(1, Math.ceil((container.scrollHeight - 2) / height)) : Math.max(1, Math.ceil((content.scrollWidth + 32 - 2) / (container.clientWidth + 32)));
        count.current = total;
        setPages(total);
        if (scroll) {
          current.current = Math.min(total - 1, Math.floor(container.scrollTop / height));
          setPage(current.current);
        } else {
          const focused = document.activeElement;
          const bounds = container.getBoundingClientRect();
          if (focused instanceof HTMLElement && content.contains(focused)) {
            const rect = focused.getBoundingClientRect();
            if (rect.width && rect.height) current.current = Math.floor((rect.left - bounds.left + container.scrollLeft + 1) / (container.clientWidth + 32));
          }
          navigate(current.current);
        }
        const bounds = container.getBoundingClientRect();
        const headings = [...content.querySelectorAll<HTMLElement>('h1,h2,h3')].filter(el => el.getClientRects().length).map(el => ({
          label: el.textContent?.trim() || 'Seção',
          page: scroll ? Math.max(0, Math.floor((el.getBoundingClientRect().top - bounds.top + container.scrollTop) / height)) : Math.max(0, Math.floor((el.getBoundingClientRect().left - bounds.left + container.scrollLeft + 1) / (container.clientWidth + 32))),
        }));
        setSections(previous => JSON.stringify(previous) === JSON.stringify(headings) ? previous : headings);
      });
    };
    const resize = new ResizeObserver(() => {
      content.querySelectorAll('[data-page-flow]').forEach(el => el.removeAttribute('data-page-flow'));
      measure();
    });
    resize.observe(container);
    const mutation = new MutationObserver(measure);
    mutation.observe(content, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'open', 'hidden'] });
    content.addEventListener('load', measure, true);
    document.fonts?.ready.then(() => { if (!disposed) measure(); });
    measure();
    return () => { disposed = true; cancelAnimationFrame(raf); resize.disconnect(); mutation.disconnect(); content.removeEventListener('load', measure, true); };
  }, [navigate, scroll]);

  const reveal = (element: Element) => {
    const container = frame.current;
    if (!container) return;
    if (scroll) return;
    const rect = element.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const target = Math.floor((rect.left - bounds.left + container.scrollLeft + 1) / (container.clientWidth + 32));
    navigate(target);
  };

  useEffect(() => {
    const hash = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const element = id && document.getElementById(id);
      if (element && flow.current?.contains(element)) reveal(element);
    };
    window.addEventListener('hashchange', hash);
    hash();
    return () => window.removeEventListener('hashchange', hash);
  }, [navigate]);

  return <div className={`page-viewport${scroll ? ' page-viewport-scroll' : ''}`}>
    <ReadingModeToggle panel />
    <div ref={frame} className="page-viewport-frame" onScroll={() => {
      const container = frame.current;
      if (!container) return;
      if (scroll) {
        const actual = Math.min(count.current - 1, Math.floor(container.scrollTop / container.clientHeight));
        current.current = actual;
        setPage(actual);
        return;
      }
      const actual = Math.round(container.scrollLeft / (container.clientWidth + 32));
      if (actual !== current.current) navigate(actual);
      if (container.scrollTop) container.scrollTop = 0;
    }} tabIndex={0} aria-label={scroll ? 'Conteúdo com rolagem' : 'Conteúdo paginado'} onFocusCapture={event => { if (event.target !== event.currentTarget) reveal(event.target); }} onKeyDown={event => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'PageDown' || event.key === 'PageUp') {
        event.preventDefault();
        navigate(current.current + (event.key === 'PageDown' ? 1 : -1));
      }
    }}>
      <div ref={flow} className="page-viewport-flow" id="painel-da-pagina">{children}</div>
    </div>
    <nav className="page-pagination print:hidden" aria-label="Páginas do conteúdo">

      <div><select className="page-section-select" aria-label="Ir para uma seção" value="" onChange={event => { if (event.target.value !== '') navigate(Number(event.target.value)); }}><option value="">{scroll ? 'Ir para seção' : section || 'Ir para seção'}</option>{sections.map((item, index) => <option key={`${item.label}-${index}`} value={item.page}>{item.label}</option>)}</select><span role="status" aria-live="polite">{scroll ? 'Rolagem livre' : `${page + 1} / ${pages}`}</span></div>

    </nav>
    <FloatingPageArrows onPrevious={() => navigate(page - 1)} onNext={() => navigate(page + 1)} previousDisabled={page === 0} nextDisabled={page + 1 >= pages} />
  </div>;
}

export default function PageViewport({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const scroll = useScrollReading();
  // Home already has its own compact, tabbed panel.
  return pathname === '/' ? children : <PaginatedContent key={pathname} scroll={scroll}>{children}</PaginatedContent>;
}
