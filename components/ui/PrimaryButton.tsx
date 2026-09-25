import type { ComponentPropsWithRef } from 'react';
import Icone, { type NomeIcone } from './Icone';
import { cx } from './cx';

interface PrimaryButtonProps extends ComponentPropsWithRef<'button'> {
  /** Icon before the label */
  icone?: NomeIcone;
  /** Busy state: disables the button and tells assistive tech it is working */
  carregando?: boolean;
  /** Label while busy; the regular label is kept when omitted */
  textoCarregando?: string;
}

/**
 * The main action of a screen: solid green, uppercase mono, with the solid
 * offset shadow that sinks on press (.btn-primary in app/globals.css).
 */
export default function PrimaryButton({
  icone,
  carregando = false,
  textoCarregando,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cx('btn-primary', className)}
    >
      {carregando ? (
        <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icone && <Icone nome={icone} tamanho={18} className="shrink-0" />
      )}
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  );
}
