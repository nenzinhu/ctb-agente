// Shared data and capability flags for the Playwright suite.

export interface ConsultaFixture {
  input: string;
  descricao: string;
  codigoEsperado?: string;
  /** Requires a seeded database to assert */
  requerBase: boolean;
}

export const CONSULTAS: ConsultaFixture[] = [
  {
    input: '516-91',
    descricao: 'consulta por código MBFT',
    codigoEsperado: '516-91',
    requerBase: true,
  },
  {
    input: 'art. 165',
    descricao: 'consulta por artigo',
    requerBase: true,
  },
  {
    input: 'estacionado em vaga de idoso',
    descricao: 'consulta por situação',
    requerBase: true,
  },
];

export const ADMIN_USER = process.env.E2E_ADMIN_USER || 'nenzinhu';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

/**
 * The database-backed assertions only run when the environment is ready.
 * Set E2E_SEEDED=1 after applying the migrations and running `npm run seed`.
 */
export const BASE_POPULADA = process.env.E2E_SEEDED === '1';

export const TEMA_PDF = process.env.E2E_TEMA_PDF || 'estacionamento';

/**
 * A minimal one-page PDF with real (selectable) text, so the compressor can
 * be exercised without a binary fixture. ASCII only.
 */
export function pdfDeTeste(texto: string): Buffer {
  const conteudo = `BT /F1 14 Tf 72 720 Td (${texto.replace(/[\\()]/g, '\\$&')}) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = objetos.map((objeto, i) => {
    const inicio = pdf.length;
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    return inicio;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
