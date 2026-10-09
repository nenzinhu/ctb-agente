import { OpenAICompatibleProvider, precoZero } from './openai-compatible';

export const NOUS_FREE_MODELS = [
  'inclusionai/ling-3.0-flash-fin',
  'inclusionai/ling-3.0-flash-sante:free',
  'inclusionai/ling-3.1-flash',
  'meituan/longcat-2.0:free',
  'meituan/longcat-2.5-preview',
  'poolside/laguna-s-2.1',
  'poolside/laguna-xs-2.1',
  'stepfun/step-3.7-flash',
  'upstage/solar-mini-4',
] as const;

function normalizarModelo(valor: string): string {
  return valor
    .toLowerCase()
    .replace(/:free\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const modelosAprovados = new Set(NOUS_FREE_MODELS.map(normalizarModelo));

function modeloAprovado(id: string, nome?: string): boolean {
  return [id, nome ?? ''].some((valor) => modelosAprovados.has(normalizarModelo(valor)));
}

export class NousProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl = 'https://inference-api.nousresearch.com/v1') {
    super({
      name: 'Nous Portal',
      apiKey,
      baseUrl,
      filtroGratis: (id, modelo) =>
        modeloAprovado(id, modelo?.name) && (id.endsWith(':free') || precoZero(modelo)),
    });
  }
}
