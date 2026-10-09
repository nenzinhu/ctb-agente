// Builds data/acervo/fatos-pmsc-mobile.json from the official table PDF.
// Usage: node --experimental-strip-types scripts/importar-fatos-pmsc.ts arquivo.pdf
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lerFatosPmsc, textoRagFatos, type PaginaFatosPdf } from '../lib/fatos-pmsc/parser.ts';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node --experimental-strip-types scripts/importar-fatos-pmsc.ts arquivo.pdf');
  process.exit(1);
}

const pdf = await getDocument({ data: new Uint8Array(readFileSync(arquivo)), disableFontFace: true, verbosity: 0 }).promise;
const paginas: PaginaFatosPdf[] = [];

for (let numero = 1; numero <= pdf.numPages; numero++) {
  const pagina = await pdf.getPage(numero);
  const { items } = await pagina.getTextContent();
  paginas.push({
    numero,
    fragmentos: items.flatMap((item) => 'str' in item && item.str.trim() ? [{
      x: item.transform[4],
      y: item.transform[5],
      texto: item.str.trim(),
      largura: item.width,
    }] : []),
  });
}

const fatos = lerFatosPmsc(paginas);
writeFileSync('data/acervo/fatos-pmsc-mobile.json', `${JSON.stringify(fatos, null, 2)}\n`);
writeFileSync('data/acervo/fatos-pmsc-mobile.txt', textoRagFatos(fatos));
console.log(`${fatos.length} fatos de ${pdf.numPages} páginas → data/acervo/fatos-pmsc-mobile.{json,txt}`);
