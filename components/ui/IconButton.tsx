import type { ComponentPropsWithRef } from 'react';
import Icone, { type NomeIcone } from './Icone';
import { cx } from './cx';

interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  icone: NomeIcone;
  /** Accessible name; also the tooltip unless `title` says otherwise */
  rotulo: string;
  tom?: 'primario' | 'perigo';
  /** `grande` = 48px, for the primary action of a field (the microphone) */
  grande?: boolean;
}

/**
 * Square icon-only button with a green border, e.g. the microphone next to a
 * field. 44px by default, 48px with `grande`: both clear the minimum touch
 * target used with gloves in the field.
 */
export default function IconButton({
  icone,
  rotulo,
  tom = 'primario',
  grande = false,
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
      className={cx('icon-btn', grande && 'icon-btn-grande', tom === 'perigo' && 'icon-btn-perigo', className)}
    >
      <Icone nome={icone} tamanho={grande ? 22 : 20} />
    </button>
  );
}
