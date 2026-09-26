import type { AIModel } from './base';
import { describeHttpError, OpenAICompatibleProvider } from './openai-compatible';
import { fetchWithTimeout } from './timeout';

const API = 'https://api.cloudflare.com/client/v4/accounts';

/**
 * Cloudflare Workers AI through its OpenAI-compatible endpoint. The free
 * allowance (daily "neurons") covers every hosted model, so the catalog is
 * the account's whole Text Generation list — which lives on the native API,
 * since the compatible one has no /models.
 */
export class CloudflareProvider extends OpenAICompatibleProvider {
  private accountId: string;

  constructor(apiKey: string, accountId: string) {
    super({
      name: 'Cloudflare Workers AI',
      apiKey,
      baseUrl: accountId ? `${API}/${accountId}/ai/v1` : '',
      baseUrlEnvVar: 'CLOUDFLARE_ACCOUNT_ID',
    });
    this.accountId = accountId;
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID não configurada');
    const response = await fetchWithTimeout(
      `${API}/${this.accountId}/ai/models/search?task=Text%20Generation&per_page=100`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
      10_000
    );
    if (!response.ok) throw new Error(await describeHttpError(this.name, response));
    const data = (await response.json()) as { result?: Array<{ name?: string }> };
    return (data.result ?? [])
      .map((m) => m.name)
      .filter((nome): nome is string => Boolean(nome))
      .map((id) => ({ id, name: id, maxTokens: 4096, costPer1kTokens: 0, isFree: true }));
  }
}
