import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { databaseAdminConfigured, supabaseAdmin } from '@/lib/db/client';
import { getEmbeddingConfig, setEmbeddingModel } from '@/lib/ai/embedding-config';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODELS, embeddingModel, isEmbeddingModelId } from '@/lib/ai/embedding-models';
import { embeddingChain } from '@/lib/ai/embeddings';

export const maxDuration = 60;

function safeMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : 'Falha ao acessar o modelo vetorial.';
  for (const key of [process.env.OPENROUTER_API_KEY, process.env.MISTRAL_API_KEY]) {
    if (key) message = message.split(key).join('[chave protegida]');
  }
  return message;
}

export async function GET() {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const config = await getEmbeddingConfig();
  let esquemaPronto = config.coluna === 'embedding';
  if (!esquemaPronto && databaseAdminConfigured) {
    try {
      const { data, error } = await supabaseAdmin.rpc('rag_embedding_schema_version');
      esquemaPronto = !error && data === 1;
    } catch { esquemaPronto = false; }
  }
  return NextResponse.json({
    modelo: config.id, configurado: config.configurado, chave: config.envVar,
    dimensoes: EMBEDDING_DIMENSIONS, esquemaPronto, bancoEscrita: databaseAdminConfigured,
    modelos: EMBEDDING_MODELS.map(({ id, nome, provedor, envVar, principal }) => ({
      id, nome, provedor, envVar, principal, configurado: Boolean(process.env[envVar]?.trim()),
    })),
  });
}

export async function PUT(request: NextRequest) {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isEmbeddingModelId(body?.modelo)) return NextResponse.json({ message: 'Modelo vetorial não permitido.' }, { status: 400 });
  try {
    await setEmbeddingModel(body.modelo);
    return NextResponse.json({ modelo: body.modelo });
  } catch (error) {
    return NextResponse.json({ message: safeMessage(error) }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await validateSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isEmbeddingModelId(body?.modelo)) return NextResponse.json({ message: 'Modelo vetorial não permitido.' }, { status: 400 });
  const config = await getEmbeddingConfig();
  const model = embeddingModel(body.modelo);
  const configured = config.id === model.id ? config.configurado : Boolean(process.env[model.envVar]?.trim());
  if (!configured) return NextResponse.json({ ok: false, message: `Defina ${model.envVar} no ambiente do servidor.` }, { status: 503 });
  const started = Date.now();
  try {
    const vector = await embeddingChain.embed('Consulta de legislação de trânsito.', model.id);
    if (vector.length !== EMBEDDING_DIMENSIONS) throw new Error('O modelo retornou uma dimensão incompatível com o RAG.');
    return NextResponse.json({ ok: true, modelo: model.id, dimensoes: vector.length, latenciaMs: Date.now() - started });
  } catch (error) {
    return NextResponse.json({ ok: false, message: safeMessage(error) }, { status: 502 });
  }
}
