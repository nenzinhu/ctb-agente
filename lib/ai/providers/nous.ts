import { OpenAICompatibleProvider, precoZero, type ModeloListado } from './openai-compatible';

/** The only Nous models offered, by the name the portal shows (minus ":free"). */
export const MODELOS_NOUS_PERMITIDOS = [
  'Solar Pro4',
  'Ling 3.0 Flash Sante',
  'Ling 3.0 Flash Fin',
  'Space Bunny Alpha',
  'Laguna Xs 2.1',
  'Laguna S 2.1',
  'Step 3.7 Flash',
];

const chave = (t: string) =>
  t
    .toLowerCase()
    .replace(/:free$/, '')
    .replace(/[^a-z0-9]/g, '');

const PERMITIDOS = new Set(MODELOS_NOUS_PERMITIDOS.map(chave));

/** Matches by display name or by the id's last segment ("upstage/solar-pro4:free"). */
export function modeloNousPermitido(id: string, modelo?: ModeloListado): boolean {
  const nomes = [modelo?.name ?? '', id.split('/').pop() ?? ''];
  return nomes.some((n) => PERMITIDOS.has(chave(n)));
}

export class NousProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, baseUrl = 'https://inference-api.nousresearch.com/v1') {
    super({
      name: 'Nous Portal',
      apiKey,
      baseUrl,
      // Free (":free" route or zero price) AND on the curated list above.
      filtroGratis: (id, modelo) => (id.endsWith(':free') || precoZero(modelo)) && modeloNousPermitido(id, modelo),
    });
  }
}
