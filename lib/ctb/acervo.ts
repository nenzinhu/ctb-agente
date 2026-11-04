import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { extrairArtigosCtb, FONTE_CTB, AVISO_ACERVO, numeroArtigo, type ArtigoConsulta } from './artigos';
let cache: ArtigoConsulta[] | undefined;
export function artigosDoAcervo(): ArtigoConsulta[] {
  if (!cache) {
    const texto = readFileSync(join(process.cwd(), 'data/acervo/ctb-lei-9503-compilado.txt'), 'utf8');
    const versao = createHash('sha256').update(texto).digest('hex').slice(0, 12);
    cache = extrairArtigosCtb(texto).map(a => ({ ...a, versao, fonte: `${FONTE_CTB}#art${a.numero.replace('-', '').toLowerCase()}`, aviso: AVISO_ACERVO }));
  }
  return cache;
}
export function artigoDoAcervo(numero: string) { const n = numeroArtigo(numero); return n ? artigosDoAcervo().find(a => a.numero === n) ?? null : null; }
