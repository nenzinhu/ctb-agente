import type { Etapa } from './ui/Stepper';

/** The consultation journey shown by the Stepper on the home and result pages. */
export const ETAPAS_CONSULTA: readonly Etapa[] = [
  { id: 'consulta', rotulo: 'Consulta' },
  { id: 'enquadramento', rotulo: 'Enquadramento' },
  { id: 'autuacao', rotulo: 'Autuação' },
];
