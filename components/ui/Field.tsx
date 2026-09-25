import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from './cx';

interface CampoBase {
  label: string;
  /** Help text under the control */
  hint?: ReactNode;
  /** Validation message; also marks the control as invalid */
  erro?: string | null;
  /** Control placed beside the field, such as an IconButton */
  acao?: ReactNode;
  /** Classes for the wrapper */
  className?: string;
  /** Extra classes for the control itself */
  controlClassName?: string;
}

type Controle =
  | ({ as?: 'input' } & Omit<ComponentPropsWithRef<'input'>, 'className'>)
  | ({ as: 'textarea' } & Omit<ComponentPropsWithRef<'textarea'>, 'className'>)
  | ({ as: 'select' } & Omit<ComponentPropsWithRef<'select'>, 'className'>);

export type FieldProps = CampoBase & Controle;

/**
 * Label + control wired together: the label targets the control, and the
 * hint and error are announced with it (aria-describedby).
 */
export default function Field({ label, hint, erro, acao, className, controlClassName, ...controle }: FieldProps) {
  const gerado = useId();
  const id = controle.id ?? `campo-${gerado}`;
  const idDica = hint ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;

  const comum = {
    id,
    'aria-describedby': cx(controle['aria-describedby'], idErro, idDica) || undefined,
    'aria-invalid': erro ? true : controle['aria-invalid'],
    className: cx('input', controlClassName),
  };

  let campo: ReactNode;
  if (controle.as === 'textarea') {
    const { as: _as, ...resto } = controle;
    campo = <textarea {...resto} {...comum} />;
  } else if (controle.as === 'select') {
    const { as: _as, ...resto } = controle;
    campo = <select {...resto} {...comum} />;
  } else {
    const { as: _as, ...resto } = controle;
    campo = <input {...resto} {...comum} />;
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {acao ? (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{campo}</div>
          {acao}
        </div>
      ) : (
        campo
      )}
      {erro && (
        <p id={idErro} className="field-error" role="alert">
          {erro}
        </p>
      )}
      {hint && (
        <p id={idDica} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}
