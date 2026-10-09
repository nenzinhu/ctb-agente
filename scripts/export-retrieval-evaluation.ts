// Exporta candidatos anonimizados para revisão humana. O IP nunca é consultado.
// Uso: node --env-file-if-exists=.env.local scripts/export-retrieval-evaluation.ts
import { createClient } from '@supabase/supabase-js';
import { prepararConsultasReais } from '../lib/search/evaluation.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase
  .from('uso_diario')
  .select('pergunta,tipo_consulta')
  .not('pergunta', 'is', null)
  .order('timestamp', { ascending: false })
  .limit(2_000);

if (error) {
  console.error(`Falha ao carregar consultas: ${error.message}`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify(prepararConsultasReais(data ?? []), null, 2)}\n`);
