// Builds data/acervo/mbft-fichas.json from the official MBFT PDF (Volume I).
// Usage: node scripts/importar-mbft.ts caminho/do/mbft.pdf
// The PDF itself stays out of git; the JSON it produces is what the app reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lerFichas, type Linha, type Pagina } from '../lib/mbft/parser.ts';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node scripts/importar-mbft.ts caminho/do/mbft.pdf');
  process.exit(1);
}

const pdf = await getDocument({ data: new Uint8Array(readFileSync(arquivo)), disableFontFace: true, verbosity: 0 }).promise;
const paginas: Pagina[] = [];

for (let numero = 1; numero <= pdf.numPages; numero++) {
  const pagina = await pdf.getPage(numero);
  const { items } = await pagina.getTextContent();
  // Group fragments into lines by their baseline
  const porY = new Map<number, Linha>();
  for (const item of items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const linha = porY.get(y) ?? [];
    linha.push({ x: item.transform[4], texto: item.str.trim() });
    porY.set(y, linha);
  }
  const linhas = [...porY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, linha]) => linha.sort((a, b) => a.x - b.x));
  paginas.push({ numero, linhas });
}

const fichas = lerFichas(paginas);
writeFileSync('data/acervo/mbft-fichas.json', JSON.stringify(fichas));
console.log(`${fichas.length} fichas de ${pdf.numPages} páginas → data/acervo/mbft-fichas.json`);
