# Apostilas para Todo o Acervo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Permitir que agentes pesquisem qualquer documento indexado e gerem uma apostila didática institucional a partir do documento inteiro ou de intervalos de páginas rastreáveis.

**Arquitetura:** Um repositório de apostilas no servidor unificará documentos armazenados em `dispositivos` e `documento_trechos`, sem expor o corpus ao navegador. A API validará a seleção, recuperará e agrupará somente os trechos do documento escolhido e usará a geração existente com prompt genérico, fallback oficial, cache e PDF institucional.

**Stack tecnológica:** Next.js 15, React 19, TypeScript, Zod, Supabase/PostgreSQL/pgvector, Jest, Testing Library e gerador PDF interno.

**Especificação:** `docs/superpowers/specs/2026-10-12-apostilas-acervo-documental-design.md`

## Restrições globais

- Toda a interface, mensagens, prompts e conteúdo gerado devem usar português do Brasil.
- O público técnico deve aparecer apenas como **Agentes**; são proibidos “Agentes em formação” e “policiais em formação” neste fluxo.
- Somente documentos `vigente` e `revisar` são elegíveis; `substituido` é sempre recusado no servidor.
- Um pedido usa exatamente um documento e nunca aceita texto-fonte enviado pelo cliente.
- A seleção aceita documento inteiro ou intervalos como `3, 10–18, 35–40`.
- Cada capítulo e o PDF devem identificar documento, páginas utilizadas e situação documental.
- O PDF usa `public/brasao-cpmrv.jpg` e “Polícia Militar Rodoviária de Santa Catarina”.
- Conteúdo `revisar` deve ter aviso visível e nunca ser descrito como vigente.
- Não adicionar dependências de produção.
- Limites operacionais: 36.000 caracteres por geração, partes de no máximo 6.000 caracteres, no máximo 6 partes e concorrência máxima de 3 chamadas de IA.

## Foco da revisão

- Documento antigo de CTB sem páginas: modo inteiro funciona e o modo por intervalos é recusado com orientação para reindexar.
- Consulta vazia ou com somente acentos/pontuação: catálogo inicial carrega sem erro e sem pesquisa textual inválida.
- Intervalos sobrepostos, repetidos ou com travessão: páginas são deduplicadas, ordenadas e descritas corretamente.
- Documento muda para `substituido` entre listagem e geração: POST recarrega a situação e recusa o pedido.
- Falha parcial dos modelos: partes bem-sucedidas são preservadas e cada parte com falha recebe fallback oficial rastreável.

---

## Estrutura de arquivos

- `lib/apostila/tipos.ts`: contratos compartilhados do catálogo, seleção, trechos e capítulos.
- `lib/apostila/paginas.ts`: parser, normalização e rótulo de intervalos.
- `lib/apostila/repositorio.ts`: catálogo e recuperação unificada no Supabase.
- `lib/apostila/conteudo.ts`: agrupamento ordenado e limites de conteúdo.
- `lib/rag/apostila.ts`: prompt genérico, fallback e blocos do PDF.
- `app/api/apostila/handler.ts`: orquestração, cache, rate limit e chamadas de IA.
- `app/api/apostila/route.ts`: contratos HTTP de listagem e geração.
- `components/GerarApostila.tsx`: fluxo responsivo em três etapas.
- `scripts/migrations-014-apostila-paginas.sql`: páginas nos trechos CTB e índices de recuperação.

### Tarefa 1: Intervalos de páginas e contratos do domínio

**Arquivos:**
- Criar: `lib/apostila/tipos.ts`
- Criar: `lib/apostila/paginas.ts`
- Criar: `tests/unit/apostila-paginas.test.ts`

**Interfaces:**
- Produz: `parseSelecaoPaginas(valor: string, paginaMaxima?: number): SelecaoPaginasNormalizada`.
- Produz: `rotuloSelecaoPaginas(selecao: SelecaoPaginasNormalizada): string`.
- Produz: tipos `DocumentoApostila`, `TrechoApostila`, `SelecaoApostila`, `SelecaoPaginasNormalizada`, `ParteApostila` e `CapituloApostila`.
- `SelecaoApostila` é `{ modo: 'inteiro' } | { modo: 'paginas'; intervalos: string }`.

- [ ] **Passo 1: Escrever testes que falham para o parser**

Cobrir `3, 10-18, 35–40`, espaços, página repetida, intervalos sobrepostos, zero, negativo, intervalo invertido, token inválido e página acima de `paginaMaxima`. Fixar que o resultado contém páginas únicas ordenadas e intervalos canônicos compactados.

- [ ] **Passo 2: Executar o teste e confirmar a falha**

Executar: `npm test -- --runInBand tests/unit/apostila-paginas.test.ts`

Esperado: FAIL porque os módulos ainda não existem.

- [ ] **Passo 3: Implementar os tipos e `parseSelecaoPaginas`**

Usar erro de domínio `SelecaoPaginasInvalida` com mensagem pronta em português. Aceitar `-`, `–` e `—`; limitar a seleção normalizada a 2.000 páginas para impedir expansão abusiva antes da consulta ao banco.

- [ ] **Passo 4: Implementar `rotuloSelecaoPaginas` e completar os testes**

Fixar rótulos como `página 3` e `páginas 3, 10–18 e 35–40`.

- [ ] **Passo 5: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/unit/apostila-paginas.test.ts && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 6: Criar commit**

```bash
git add lib/apostila/tipos.ts lib/apostila/paginas.ts tests/unit/apostila-paginas.test.ts
git commit -m "feat: valida intervalos de páginas da apostila"
```

### Tarefa 2: Persistir páginas nos documentos CTB/MBFT

**Arquivos:**
- Criar: `scripts/migrations-014-apostila-paginas.sql`
- Modificar: `lib/ingestion/processor.ts`
- Modificar: `tests/unit/processor.test.ts`
- Criar: `tests/unit/apostila-pages-migration.test.ts`

**Interfaces:**
- Consome: `Chunk.page` já produzido pela extração.
- Produz: coluna anulável `public.dispositivos.pagina INTEGER` e índice `(documento_id, pagina, ordem)`.
- Produz: RPC `search_documentos_apostila(query_text TEXT, limit_count INT)` que retorna `documento_id` e relevância, unindo título e conteúdo de `dispositivos`/`documento_trechos`.
- Produz: novos registros CTB com `pagina: chunk.page ?? null`.

- [ ] **Passo 1: Escrever testes que falham para migração e ingestão**

O teste SQL deve exigir `ADD COLUMN IF NOT EXISTS pagina`, índice composto idempotente, a RPC unificada protegida para `service_role` e nenhuma tentativa de inferir páginas antigas. O teste do processador deve exigir que o payload de `dispositivos` persista a página do chunk.

- [ ] **Passo 2: Executar os testes e confirmar as falhas**

Executar: `npm test -- --runInBand tests/unit/apostila-pages-migration.test.ts tests/unit/processor.test.ts`

Esperado: FAIL nas asserções da coluna e do payload.

- [ ] **Passo 3: Criar a migração idempotente**

A migração terá comentário operacional explicando que documentos anteriores precisam ser reindexados para habilitar faixas; valores existentes permanecem `NULL`. A RPC pesquisará `documentos.titulo` e os vetores textuais portugueses das duas tabelas, agrupará por documento e limitará resultados antes de retornar IDs.

- [ ] **Passo 4: Persistir `chunk.page` em `processDispositivos`**

Adicionar somente o campo `pagina`; não alterar chunking, embeddings ou citações.

- [ ] **Passo 5: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/unit/apostila-pages-migration.test.ts tests/unit/processor.test.ts && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 6: Criar commit**

```bash
git add scripts/migrations-014-apostila-paginas.sql lib/ingestion/processor.ts tests/unit/apostila-pages-migration.test.ts tests/unit/processor.test.ts
git commit -m "feat: preserva páginas dos documentos CTB"
```

### Tarefa 3: Repositório unificado do acervo para apostilas

**Arquivos:**
- Criar: `lib/apostila/repositorio.ts`
- Criar: `tests/unit/apostila-repositorio.test.ts`
- Modificar: `lib/ingestion/documents.ts`

**Interfaces:**
- Consome: `DocumentoApostila`, `TrechoApostila` e `SelecaoPaginasNormalizada` da Tarefa 1.
- Produz: `listarDocumentosApostila(consulta?: string, limite?: number): Promise<DocumentoApostila[]>`.
- Produz: `obterDocumentoApostila(id: string): Promise<DocumentoApostilaInterno | null>`, cujo tipo interno inclui `hashConteudo`.
- Produz: `carregarTrechosApostila(documento: DocumentoApostilaInterno, paginas?: number[]): Promise<TrechoApostila[]>`.

- [ ] **Passo 1: Escrever testes que falham para elegibilidade, busca e leitura**

Cobrir: somente `vigente`/`revisar`; exclusão de `substituido`; consulta vazia; título por prefixo; resultado encontrado apenas no conteúdo; CTB em `dispositivos`; demais coleções em `documento_trechos`; ordenação por página/ordem; maior página disponível; e CTB antigo com todas as páginas nulas.

- [ ] **Passo 2: Executar o teste e confirmar a falha**

Executar: `npm test -- --runInBand tests/unit/apostila-repositorio.test.ts`

Esperado: FAIL porque o repositório ainda não existe.

- [ ] **Passo 3: Expor o hash apenas para uso interno seguro**

Adicionar uma consulta interna em `lib/ingestion/documents.ts` sem incluir `hash_conteudo` no contrato público administrativo existente.

- [ ] **Passo 4: Implementar listagem e pesquisa**

Limitar a 30 resultados por padrão e 50 no máximo. Para consulta não vazia, chamar `search_documentos_apostila`, preservando a ordem por relevância; não executar busca vetorial nem reranker de IA no catálogo.

- [ ] **Passo 5: Implementar recuperação unificada**

Usar uma consulta ordenada por tabela; quando houver páginas, filtrar com `in('pagina', paginas)`. Recarregar situação e hash no momento da geração.

- [ ] **Passo 6: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/unit/apostila-repositorio.test.ts && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 7: Criar commit**

```bash
git add lib/apostila/repositorio.ts lib/ingestion/documents.ts tests/unit/apostila-repositorio.test.ts
git commit -m "feat: unifica acervo documental das apostilas"
```

### Tarefa 4: Preparar partes e gerar capítulos rastreáveis

**Arquivos:**
- Criar: `lib/apostila/conteudo.ts`
- Criar: `tests/unit/apostila-conteudo.test.ts`
- Modificar: `lib/rag/apostila.ts`
- Modificar: `app/api/apostila/handler.ts`
- Modificar: `tests/api/apostila.test.ts`

**Interfaces:**
- Consome: repositório da Tarefa 3 e tipos da Tarefa 1.
- Produz: `prepararPartesApostila(trechos: TrechoApostila[]): ParteApostila[]`.
- Produz: `promptCapituloDocumento(documento, parte, publico): string`.
- Produz: `capituloDocumentoSemIA(documento, parte): CapituloApostila`.
- Produz: `gerarApostilaDocumento(pedido, ip): Promise<ResultadoGeracaoApostila>`.

- [ ] **Passo 1: Escrever testes que falham para agrupamento e limites**

Fixar `MAX_CARACTERES_APOSTILA = 36_000`, `MAX_CARACTERES_PARTE = 6_000`, máximo de 6 partes, preservação da ordem, páginas únicas por parte e erro `conteudo_excessivo` sem truncamento.

- [ ] **Passo 2: Executar o teste e confirmar a falha**

Executar: `npm test -- --runInBand tests/unit/apostila-conteudo.test.ts`

Esperado: FAIL porque o módulo ainda não existe.

- [ ] **Passo 3: Implementar `prepararPartesApostila`**

Agrupar por página e seção antes de dividir por tamanho; nunca partir uma linha no meio quando houver quebra disponível.

- [ ] **Passo 4: Escrever testes que falham para prompt, fallback, cache e falha parcial**

Exigir português do Brasil, título, páginas, situação, proibição de inventar regras, aviso `Em revisão`, chave `apostila:v3:<hash>:<paginas|inteiro>:<publico>:<indice>` e fallback por parte. Testar no máximo 3 gerações simultâneas.

- [ ] **Passo 5: Executar os testes de API e confirmar as falhas**

Executar: `npm test -- --runInBand tests/api/apostila.test.ts`

Esperado: FAIL no novo contrato documental.

- [ ] **Passo 6: Generalizar prompt, fallback e blocos PDF**

Manter `blocosDaApostila`, acrescentando metadados de origem e aviso por capítulo. Remover de `PUBLICO.agente` toda referência a formação.

- [ ] **Passo 7: Implementar a orquestração documental**

Revalidar documento/situação, normalizar páginas, carregar trechos, preparar partes, aplicar rate limit, cache e concorrência 3. Uma rejeição de modelo afeta somente sua parte.

- [ ] **Passo 8: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/unit/apostila-conteudo.test.ts tests/api/apostila.test.ts && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 9: Criar commit**

```bash
git add lib/apostila/conteudo.ts lib/rag/apostila.ts app/api/apostila/handler.ts tests/unit/apostila-conteudo.test.ts tests/api/apostila.test.ts
git commit -m "feat: gera apostilas rastreáveis pelo RAG"
```

### Tarefa 5: Contratos HTTP seguros do catálogo e da geração

**Arquivos:**
- Modificar: `app/api/apostila/route.ts`
- Criar: `tests/api/apostila-documentos.test.ts`
- Modificar: `tests/api/apostila.test.ts`

**Interfaces:**
- Consome: `listarDocumentosApostila` e `gerarApostilaDocumento`.
- Produz: `GET /api/apostila?q=<texto>` com `{ documentos, bancoConfigurado }`.
- Produz: `POST /api/apostila` com `{ documentoId, selecao, publico, titulo? }`.

- [ ] **Passo 1: Escrever testes que falham para GET**

Cobrir consulta ausente, consulta limitada a 200 caracteres, banco não configurado, lista pública sem hash/nome interno e falha de migração em português.

- [ ] **Passo 2: Escrever testes que falham para POST**

Cobrir UUID inválido, título acima de 120 caracteres, intervalo ausente, documento substituído, página indisponível, conteúdo excessivo, rate limit e resposta bem-sucedida com metadados.

- [ ] **Passo 3: Executar os testes e confirmar as falhas**

Executar: `npm test -- --runInBand tests/api/apostila-documentos.test.ts tests/api/apostila.test.ts`

Esperado: FAIL nos novos contratos.

- [ ] **Passo 4: Implementar schemas Zod e mapeamento de erros**

O servidor deriva IP como hoje, remove duplicidade lógica pela normalização e nunca aceita situação, páginas efetivas ou texto oficial informados pelo cliente.

- [ ] **Passo 5: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/api/apostila-documentos.test.ts tests/api/apostila.test.ts && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 6: Criar commit**

```bash
git add app/api/apostila/route.ts tests/api/apostila-documentos.test.ts tests/api/apostila.test.ts
git commit -m "feat: expõe catálogo seguro para apostilas"
```

### Tarefa 6: Interface responsiva para documento inteiro ou páginas

**Arquivos:**
- Modificar: `components/GerarApostila.tsx`
- Criar: `tests/components/gerar-apostila.test.tsx`
- Modificar: `app/apostila/page.tsx`
- Modificar: `app/page.tsx`

**Interfaces:**
- Consome: GET e POST da Tarefa 5.
- Produz: fluxo visual `Documento → Conteúdo → Gerar`, sem dropdown obrigatório.

- [ ] **Passo 1: Escrever testes que falham para catálogo e nomenclatura**

Exigir “Agentes”, ausência de `/em formação/i`, carregamento inicial, pesquisa por título/conteúdo, cartões com coleção/páginas/situação e seleção de somente um documento.

- [ ] **Passo 2: Escrever testes que falham para seleção e geração**

Cobrir documento inteiro, intervalos livres, resumo normalizado, bloqueio de faixas em documento antigo sem páginas, aviso `Em revisão`, payload do POST, prévia e download com brasão/nome institucional.

- [ ] **Passo 3: Executar o teste e confirmar a falha**

Executar: `npm test -- --runInBand tests/components/gerar-apostila.test.tsx`

Esperado: FAIL porque a interface ainda usa MBFT/POP e IDs de itens.

- [ ] **Passo 4: Refatorar `GerarApostila` para o catálogo documental**

Usar cartões/linhas acessíveis, estados explícitos de carregamento/erro/vazio, botões de modo e campo de intervalos. Manter áreas clicáveis mínimas de 44 px e empilhamento em mobile.

- [ ] **Passo 5: Atualizar metadados e texto da página inicial**

Substituir menções exclusivas a MBFT/POP por “documentos indexados do acervo”, sem alterar navegação.

- [ ] **Passo 6: Executar testes e typecheck**

Executar: `npm test -- --runInBand tests/components/gerar-apostila.test.tsx && npm run typecheck`

Esperado: PASS e typecheck sem erros.

- [ ] **Passo 7: Criar commit**

```bash
git add components/GerarApostila.tsx tests/components/gerar-apostila.test.tsx app/apostila/page.tsx app/page.tsx
git commit -m "feat: amplia apostilas para todo o acervo"
```

### Tarefa 7: Verificação integrada e documentação operacional

**Arquivos:**
- Modificar: `README.md`
- Modificar: `tests/e2e/full-flow.test.ts`
- Modificar, se necessário: arquivos tocados nas Tarefas 1–6 para corrigir achados.

**Interfaces:**
- Consome: fluxo completo das tarefas anteriores.
- Produz: instrução para aplicar `scripts/migrations-014-apostila-paginas.sql` e reindexar documentos CTB antigos que precisem de seleção por páginas.

- [ ] **Passo 1: Atualizar o teste E2E da aba Apostilas**

Verificar título, público “Agentes”, pesquisa, seleção de documento e controles de documento inteiro/páginas usando respostas de API interceptadas, incluindo viewport mobile.

- [ ] **Passo 2: Atualizar o README operacional**

Documentar ordem da migração, comportamento de documentos antigos, estados `vigente`/`revisar`/`substituido` e limite de 36.000 caracteres.

- [ ] **Passo 3: Executar testes direcionados**

Executar: `npm test -- --runInBand tests/unit/apostila-paginas.test.ts tests/unit/apostila-pages-migration.test.ts tests/unit/apostila-repositorio.test.ts tests/unit/apostila-conteudo.test.ts tests/api/apostila-documentos.test.ts tests/api/apostila.test.ts tests/components/gerar-apostila.test.tsx`

Esperado: todos PASS.

- [ ] **Passo 4: Executar suíte completa**

Executar: `npm test -- --runInBand`

Esperado: todas as suítes PASS.

- [ ] **Passo 5: Executar verificações de produção**

Executar: `npm run typecheck && npm run build`

Esperado: typecheck sem erros e build de produção concluído.

- [ ] **Passo 6: Fazer inspeção textual e do diff**

Executar: `rg -n -i "agentes? em forma[cç][aã]o|policiais? em forma[cç][aã]o" components/GerarApostila.tsx lib/rag/apostila.ts app/apostila app/page.tsx && git diff --check`

Esperado: `rg` sem resultados e `git diff --check` sem erros.

- [ ] **Passo 7: Criar commit final**

```bash
git add README.md tests/e2e/full-flow.test.ts
git commit -m "docs: orienta apostilas do acervo documental"
```

- [ ] **Passo 8: Revisar o conjunto completo antes de integrar**

Comparar o diff com os 10 critérios de aceite da especificação e confirmar que `AGENTS.md` não foi adicionado.
