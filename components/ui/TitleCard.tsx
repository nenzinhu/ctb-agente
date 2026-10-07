import type { ReactNode } from 'react';
import Icone, { type NomeIcone } from './Icone';
import { cx } from './cx';

interface TitleCardProps {
  /** The page's h1 */
  titulo: string;
  icone?: NomeIcone;
  subtitulo?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Centered page heading with an optional icon and supporting text.
 */
export default function TitleCard({ titulo, icone, subtitulo, className, children }: TitleCardProps) {
  return (
    <div className={cx('card-destaque', className)}>
      <h1 className="card-destaque-titulo">
        {icone && <Icone nome={icone} tamanho={22} className="shrink-0" />}
        <span className="min-w-0 break-words">{titulo}</span>
      </h1>
      {subtitulo && <p className="card-destaque-sub">{subtitulo}</p>}
      {children}
    </div>
  );
}
