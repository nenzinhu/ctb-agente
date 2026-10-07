import type { ReactNode } from 'react';
import Icone, { type NomeIcone } from './Icone';
import { cx } from './cx';

interface SectionCardProps {
  titulo: string;
  /** Step number, in gold before the title ("1. TEMA"); replaces the icon */
  numero?: number;
  icone?: NomeIcone;
  /** Heading level, so the card fits the page outline */
  nivel?: 2 | 3;
  /** Content at the right of the title row (badge, counter, action) */
  acao?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Form/content card with a heading, optional action and subtle divider.
 */
export default function SectionCard({
  titulo,
  numero,
  icone,
  nivel = 2,
  acao,
  id,
  className,
  children,
}: SectionCardProps) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';

  return (
    <section id={id} className={cx('card card-pad', className)}>
      <div className="card-head">
        <Titulo className="section-title">
          {numero !== undefined ? (
            <span className="section-number">{numero}.</span>
          ) : (
            icone && <Icone nome={icone} tamanho={18} className="shrink-0" />
          )}
          <span className="min-w-0">{titulo}</span>
        </Titulo>
        {acao}
      </div>
      {children}
    </section>
  );
}
