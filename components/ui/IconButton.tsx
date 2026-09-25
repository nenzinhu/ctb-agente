import type { ComponentPropsWithRef } from 'react';
import Icone, { type NomeIcone } from './Icone';
import { cx } from './cx';

interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  icone: NomeIcone;
  /** Accessible name; also the tooltip unless `title` says otherwise */
  rotulo: string;
  tom?: 'primario' | 'perigo';
}

/**
 * Square 40px icon-only button with a green border, e.g. the microphone next
 * to a field.
 */
export default function IconButton({
  icone,
  rotulo,
  tom = 'primario',
  title,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={rotulo}
      title={title ?? rotulo}
      className={cx('icon-btn', tom === 'perigo' && 'icon-btn-perigo', className)}
    >
      <Icone nome={icone} tamanho={20} />
    </button>
  );
}
