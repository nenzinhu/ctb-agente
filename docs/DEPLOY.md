# Guia de Deploy — CTB Agente

Deploy em Vercel (front + API routes) com Supabase (PostgreSQL + pgvector).

## 1. Pré-requisitos

- Conta na Vercel com o repositório conectado
- Projeto Supabase com a extensão `vector` disponível
- Chaves dos provedores de IA que você vai usar (basta uma, mas a cadeia fica mais robusta com mais)
- Conta Cloudflare Turnstile (site key + secret key)
- Node.js 20+ localmente (o projeto foi validado em Node 24)

## 2. Banco de dados

No SQL Editor do Supabase, aplique **nesta ordem**:

1. `scripts/migrations.sql` — tabelas `dispositivos`, `enquadramentos`, `remissoes`,
   `cache_respostas`, `uso_diario`, `jurisprudencia`, índices e pgvector
2. `scripts/migrations-002-config.sql` — `configuracoes`, `ip_bloqueados`,
   coluna `uso_diario.pergunta` e índices de apoio
3. `scripts/migrations-003-search-functions.sql` — funções RPC
   `search_dispositivos_tsvector` e `search_dispositivos_vector` usadas pela
   busca híbrida; sem elas a busca degrada silenciosamente (sem erro)

Confira se as tabelas existem:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

### Funções RPC necessárias para a busca híbrida

O BM25 e a busca vetorial chamam funções RPC. Os comentários em
`lib/search/bm25.ts` e `lib/search/vector.ts` trazem o SQL exato
(`search_dispositivos_tsvector` e `search_dispositivos_vector`).

Se as RPCs não existirem, a consulta continua funcionando: a busca híbrida
degrada e a resposta vem do restante da base, sem erro 500.

### Corpus inicial

```bash
cp .env.local.example .env.local   # preencha as variáveis
npm run seed                       # popula dispositivos, enquadramentos e jurisprudência
```

> ⚠️ O seed insere **dados de exemplo**. Revise códigos MBFT, valores de multa
> (armazenados em centavos) e amparos legais antes de usar em produção — ou
> cadastre tudo pelo painel `/admin` → Enquadramentos.

## 3. Variáveis de ambiente na Vercel

Settings → Environment Variables, marcadas para **Production** (e Preview, se quiser):

| Variável | Origem | Para que serve |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Conexão do banco |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Leitura pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Escritas do painel, cache e seed |
| `ADMIN_PASSWORD_HASH` | bcrypt (abaixo) | Login do painel master |
| `GROQ_API_KEY` | Groq Console | Provedor 1 (resposta rápida) / voz |
| `NVIDIA_API_KEY` | NVIDIA NIM | Provedor 2 |
| `OPENROUTER_API_KEY` | OpenRouter | Provedor 3 |
| `MISTRAL_API_KEY` | Mistral | Provedor 4 + embeddings |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | Exibe o widget |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | Valida o token no servidor |
| `RATE_LIMIT_QUERIES_PER_HOUR` | você | Limite inicial (depois ajustável no painel) |

Hash da senha do master:

```bash
node -e "console.log(require('bcryptjs').hashSync('sua-senha-forte', 12))"
```

O usuário é fixo: `nenzinhu`. Sem `ADMIN_PASSWORD_HASH` o painel aceita
qualquer senha — comportamento apenas para desenvolvimento.

## 4. Deploy

```bash
git push origin master
```

A Vercel builda automaticamente. A CI (`.github/workflows/ci.yml`) roda
typecheck, testes e build em cada push.

## 5. Verificação pós-deploy

| Passo | Como checar |
|---|---|
| Healthcheck | `curl -s https://SEU-DOMINIO/api/health` → `status: ok` |
| Home | abre com a navegação (Consulta, Gerar PDF, Painel) |
| Consulta por código | `516-91` → cartão com gravidade, pontos, multa e checklist |
| Consulta por artigo | `art. 165` → normas aplicáveis e citações validadas |
| Dossiê | `/gerador-pdf` → escolher tema → "Baixar PDF" gera arquivo |
| Painel | `/admin` → login → abas Documentos, Enquadramentos, Provedores, Uso, Limites |
| Voz | no formulário, "Ditar consulta por voz" (requer `GROQ_API_KEY` e HTTPS) |
| Modo sol | botão no topo alterna o alto contraste e persiste |

Se `/api/health` retornar `degraded`, o banco está inacessível: confira as
chaves do Supabase e se as migrations foram aplicadas.

## 6. Testes end-to-end

```bash
npm run test:e2e            # sobe o app em :3210 e roda o Playwright
npx playwright install      # na primeira vez, baixa o Chromium
E2E_SEEDED=1 npm run test:e2e   # inclui os fluxos que exigem base populada
```

## 7. Operação

- **Limites:** `/admin` → Limites (consultas/IP/hora, Turnstile on/off, IPs bloqueados).
- **Cache:** respostas e dossiês ficam em `cache_respostas` (30 dias para
  consultas, 7 dias para PDFs) e são invalidados quando a base muda.
- **Uso:** `/admin` → Uso traz consultas por dia, cache hit, perguntas sem
  resposta (lacunas da base) e falhas por recurso.
- **Rollback:** Vercel → Deployments → promover um deployment anterior.

## 8. Limitações conhecidas

- O texto das respostas simples e dos exemplos é gerado por template
  determinístico (não por LLM) quando não há chave configurada.
- Os ícones PWA são gerados por `npm run icons` (script sem dependências);
  troque por um logo oficial quando existir.
- Projetos de lei vêm da API de dados abertos da Câmara e podem falhar; o
  dossiê é gerado mesmo assim, marcando a seção como sem resultados.
