import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { artigosDoAcervo } from '@/lib/ctb/acervo';
import type { PacoteOffline } from '@/lib/offline/model';
export async function GET() {
  try {
    const fichas = JSON.parse(readFileSync(join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8'));
    const pops = JSON.parse(readFileSync(join(process.cwd(), 'data/acervo/pop-pmsc.json'), 'utf8'));
    const artigos = artigosDoAcervo();
    const versao = createHash('sha256').update(JSON.stringify({ fichas, pops, artigos })).digest('hex').slice(0, 16);
    const pacote: PacoteOffline = { schema: 1, versao, artigos, fichas, pops };
    return Response.json(pacote, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ message: 'O pacote não está disponível. Tente novamente com conexão.' }, { status: 503 }); }
}
