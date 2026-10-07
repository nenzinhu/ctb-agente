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
4. `scripts/migrations-004-rls.sql` — habilita Row Level Security em todas as
   tabelas e libera SELECT público só onde o app lê com a chave anônima.
   **Sem essa migration, a chave pública (exposta no bundle do navegador)
   tem leitura e escrita total no banco.**
5. `scripts/migrations-005-pin-function-search-path.sql` — fixa o
   `search_path` das funções RPC (hardening recomendado pelo linter do
   Supabase)
6. `scripts/migrations-006-documents-storage-bucket.sql` — cria o bucket
   privado `documentos-pendentes` usado pelo upload de documentos
   (`/api/admin/documents/upload-url` + `/api/ingestion/upload`)
7. `scripts/migrations-007-ratelimit-cache.sql` — rate limit atômico e
   invalidação do cache (opcional)
8. `scripts/migrations-008-rag-indexacao.sql` — busca sem acento e com
   palavras em OR, índices HNSW, tabelas `documentos` e `documento_trechos`
   (base da aba POP-PMSC), bucket aceitando DOC e Markdown e
   `numero_dispositivo` sem UNIQUE (a mesma correção da
   `migrations-007-drop-numero-dispositivo-unique.sql`, que então pode ser
   pulada). Idempotente: pode ser reaplicada sem perder dados.
9. `scripts/migrations-009-config-extended.sql` — configurações avançadas de
   busca, chunking, provedores e cache.
10. `scripts/migrations-010-rag-precision-performance.sql` — pesquisa por
   prefixos, cobertura mínima para consultas longas, limiar de similaridade
   vetorial e marcador de versão conferido por `/api/health`.

Depois da 008: `/admin` → Base CTB → **Indexar agora** carrega o CTB
compilado que acompanha o app (`data/acervo/`). Trechos indexados antes
da correção aparecem em "Documentos indexados" como **Trechos antigos** e
podem ser excluídos ali.

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
| `ADMIN_USERNAME` | você (opcional; padrão `nenzinhu`) | Usuário do painel master |
| `ADMIN_PASSWORD_HASH` | bcrypt (abaixo) | Login do painel master |
| `GROQ_API_KEY` | Groq Console | Provedor 1 (resposta rápida) / voz |
| `NVIDIA_API_KEY` | NVIDIA NIM | Provedor 2 |
| `OPENROUTER_API_KEY` | OpenRouter | Provedor 3 |
| `MISTRAL_API_KEY` | Mistral | Provedor 4 + embeddings (vetores semânticos; sem ela a busca usa só palavras) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | Exibe o widget |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | Valida o token no servidor |
| `RATE_LIMIT_QUERIES_PER_HOUR` | você | Limite inicial (depois ajustável no painel) |

Hash da senha do master:

```bash
node -e "console.log(require('bcryptjs').hashSync('sua-senha-forte', 12))"
```

O usuário padrão é `nenzinhu` e pode ser alterado com `ADMIN_USERNAME`.
`ADMIN_PASSWORD_HASH` deve receber o hash completo que começa com `$2`, nunca
a senha em texto. Sem um hash bcrypt válido, produção bloqueia o painel e a
tela de login mostra o erro de configuração. Em desenvolvimento local, a
ausência do hash mantém o acesso facilitado para testes.

## 4. Deploy

```bash
git push origin master
```

A Vercel builda automaticamente. A CI (`.github/workflows/ci.yml`) roda
typecheck, testes e build em cada push.

## 5. Verificação pós-deploy

A checagem é automática: o job `smoke` do CI (`node scripts/check-health.ts`)
aguarda o commit do push aparecer no `/api/health` e confere as rotas públicas,
falhando quando o deploy não subiu, ficou `degraded` ou alguma rota mudou de
status. Para rodar na mão:

```bash
npm run check:health                                   # produção padrão
npm run check:health -- --base=https://outro.dominio   # outro alvo
npm run check:health -- --versao=<sha> --espera=60     # exigir um commit, com prazo
```

| Passo | Como checar |
|---|---|
| Healthcheck | `curl -s https://SEU-DOMINIO/api/health` → banco, escrita e `esquemaRag: 10` |
| Home | abre com a navegação (Consulta, POP, Favoritos, Dossiê, Comprimir) |
| Consulta por código | `516-91` → cartão com gravidade, pontos, multa e checklist |
| Consulta por artigo | `art. 165` → normas aplicáveis e citações validadas |
| Dossiê | `/gerador-pdf` → escolher tema → "Baixar PDF" gera arquivo |
| POP-PMSC | `/pop` → pergunta → resposta com trechos (POP, seção e página) |
| Comprimir PDF | `/comprimir-pdf` → Máxima → "Baixar PDF" e "Baixar .txt" |
| Painel | `/admin` → login → abas Base CTB, POP-PMSC, Enquadramentos, Provedores de IA, Uso, Limites |
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
