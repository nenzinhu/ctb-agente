export type AuditStatus = 'ok' | 'atencao' | 'bloqueio';

interface AuditFunction {
  exists: boolean;
  security_definer: boolean;
  public_execute: boolean;
}

export interface SupabaseAuditSnapshot {
  meta: { generated_at: string };
  extensions: Record<string, boolean>;
  tables: Record<string, boolean>;
  columns: Record<string, boolean>;
  indexes: Record<string, boolean>;
  bucket: { exists: boolean; public: boolean };
  rls: Record<string, boolean>;
  private_access: { cache_anon: boolean; ips_anon: boolean };
  functions: Record<string, AuditFunction>;
  rag_schema_version: number | null;
  counts: Record<string, number | null>;
  seed_examples: string[];
}

export interface SupabaseAuditCheck {
  id: string;
  status: AuditStatus;
  mensagem: string;
  migration?: string;
}

export interface SupabaseAuditReport {
  status: AuditStatus;
  checks: SupabaseAuditCheck[];
  snapshot: SupabaseAuditSnapshot;
}

const REQUIRED_TABLES = [
  'dispositivos', 'enquadramentos', 'configuracoes', 'cache_respostas',
  'ip_bloqueados', 'uso_diario', 'documentos', 'documento_trechos',
];
const REQUIRED_RPCS = ['rag_schema_version', 'search_dispositivos_tsvector', 'search_dispositivos_vector'];
const PRIVILEGED_RPCS = ['register_query_and_check_limit', 'bump_corpus_version', 'purge_expired_cache'];

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function unwrapSupabaseAudit(input: unknown): SupabaseAuditSnapshot {
  let value: unknown = input;
  if (Array.isArray(value) && value.length === 1) value = value[0];
  if (record(value) && 'audit' in value) value = value.audit;
  if (!record(value)) throw new Error('Relatório de auditoria incompleto.');

  const required = ['meta', 'extensions', 'tables', 'columns', 'indexes', 'bucket', 'rls', 'private_access', 'functions', 'counts', 'seed_examples'];
  if (required.some((key) => !(key in value)) || !('rag_schema_version' in value)) {
    throw new Error('Relatório de auditoria incompleto.');
  }
  return value as unknown as SupabaseAuditSnapshot;
}

function aggregate(checks: SupabaseAuditCheck[]): AuditStatus {
  if (checks.some((check) => check.status === 'bloqueio')) return 'bloqueio';
  if (checks.some((check) => check.status === 'atencao')) return 'atencao';
  return 'ok';
}

export function evaluateSupabaseAudit(input: unknown): SupabaseAuditReport {
  const snapshot = unwrapSupabaseAudit(input);
  const checks: SupabaseAuditCheck[] = [];
  const add = (check: SupabaseAuditCheck) => checks.push(check);

  add({
    id: 'extensions',
    status: snapshot.extensions.vector && snapshot.extensions.unaccent ? 'ok' : 'bloqueio',
    mensagem: 'Extensões vector e unaccent',
    migration: 'scripts/migrations.sql',
  });

  const missingTables = REQUIRED_TABLES.filter((name) => !snapshot.tables[name]);
  add({
    id: 'tables',
    status: missingTables.length ? 'bloqueio' : 'ok',
    mensagem: missingTables.length ? `Tabelas ausentes: ${missingTables.join(', ')}` : 'Tabelas obrigatórias presentes',
    migration: missingTables.some((name) => name.startsWith('document'))
      ? 'scripts/migrations-008-rag-indexacao.sql'
      : 'scripts/migrations.sql',
  });

  const rlsMissing = REQUIRED_TABLES.filter((name) => !snapshot.rls[name]);
  add({
    id: 'rls',
    status: rlsMissing.length ? 'bloqueio' : 'ok',
    mensagem: rlsMissing.length ? `RLS ausente: ${rlsMissing.join(', ')}` : 'RLS habilitado',
    migration: 'scripts/migrations-004-rls.sql',
  });

  const privateExposed = snapshot.private_access.cache_anon || snapshot.private_access.ips_anon;
  add({
    id: 'private_tables',
    status: privateExposed ? 'bloqueio' : 'ok',
    mensagem: privateExposed ? 'Leitura anônima alcança cache ou IPs bloqueados' : 'Tabelas privadas bloqueadas para anon',
    migration: 'supabase/migrations/20261008032635_security_hardening.sql',
  });

  const missingRpcs = REQUIRED_RPCS.filter((name) => !snapshot.functions[name]?.exists);
  add({
    id: 'search_functions',
    status: missingRpcs.length ? 'bloqueio' : 'ok',
    mensagem: missingRpcs.length ? `RPCs ausentes: ${missingRpcs.join(', ')}` : 'RPCs de busca presentes',
    migration: 'scripts/migrations-003-search-functions.sql',
  });

  const privilegedExposed = PRIVILEGED_RPCS.some((name) => snapshot.functions[name]?.exists && snapshot.functions[name]?.public_execute);
  add({
    id: 'privileged_functions',
    status: privilegedExposed ? 'bloqueio' : 'ok',
    mensagem: privilegedExposed ? 'RPC privilegiada executável por papel público' : 'RPCs privilegiadas restritas',
    migration: 'supabase/migrations/20261008032635_security_hardening.sql',
  });

  add({
    id: 'rag_schema_version',
    status: snapshot.rag_schema_version === 10 ? 'ok' : 'bloqueio',
    mensagem: `Versão do esquema RAG: ${snapshot.rag_schema_version ?? 'ausente'}`,
    migration: 'scripts/migrations-010-rag-precision-performance.sql',
  });

  add({
    id: 'bucket',
    status: snapshot.bucket.exists && !snapshot.bucket.public ? 'ok' : 'bloqueio',
    mensagem: snapshot.bucket.exists && !snapshot.bucket.public ? 'Bucket privado presente' : 'Bucket ausente ou público',
    migration: 'scripts/migrations-006-documents-storage-bucket.sql',
  });

  if (snapshot.seed_examples.length) {
    add({ id: 'seed_examples', status: 'atencao', mensagem: `Dados de exemplo encontrados: ${snapshot.seed_examples.join(', ')}` });
  }

  return { status: aggregate(checks), checks, snapshot };
}
