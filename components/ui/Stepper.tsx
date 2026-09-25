import Icone from './Icone';
import { cx } from './cx';

export interface Etapa {
  id: string;
  rotulo: string;
}

type EstadoEtapa = 'feita' | 'atual' | 'pendente';

interface StepperProps {
  etapas: readonly Etapa[];
  /** Index of the current step; the ones before it are done. Use etapas.length when all are done. */
  atual: number;
  /** Accessible name of the list */
  rotulo?: string;
  className?: string;
}

const LEITURA: Record<Exclude<EstadoEtapa, 'atual'>, string> = {
  feita: 'concluída',
  pendente: 'pendente',
};

/**
 * Progress through a flow: numbered squares joined by a 2px line. The current
 * step is green with a gold ring, done steps show a check, pending ones are
 * solid in the text color.
 */
export default function Stepper({ etapas, atual, rotulo = 'Etapas', className }: StepperProps) {
  return (
    <ol aria-label={rotulo} className={cx('stepper', className)}>
      {etapas.map((etapa, indice) => {
        const estado: EstadoEtapa = indice < atual ? 'feita' : indice === atual ? 'atual' : 'pendente';
        return (
          <li
            key={etapa.id}
            data-estado={estado}
            aria-current={estado === 'atual' ? 'step' : undefined}
            className="step"
          >
            <span aria-hidden className="step-box">
              {estado === 'feita' ? <Icone nome="check" tamanho={15} strokeWidth={3} /> : indice + 1}
            </span>
            <span className="step-label">
              {etapa.rotulo}
              {estado !== 'atual' && <span className="sr-only"> ({LEITURA[estado]})</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
