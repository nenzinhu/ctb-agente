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
