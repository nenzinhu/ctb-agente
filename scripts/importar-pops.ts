// Builds data/acervo/pop-pmsc.json from the "Manual de POP PMSC Compilado" PDF.
// Usage: node scripts/importar-mbft.ts caminho/do/pop.pdf
// The PDF itself stays out of git; the JSON it produces is what the app reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Linha, Pagina } from '../lib/mbft/parser.ts';
import { lerPops } from '../lib/pop/parser.ts';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node scripts/importar-mbft.ts caminho/do/pop.pdf');
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

const pops = lerPops(paginas);
writeFileSync('data/acervo/pop-pmsc.json', JSON.stringify(pops));
console.log(`${pops.length} POPs de ${pdf.numPages} páginas → data/acervo/pop-pmsc.json`);
