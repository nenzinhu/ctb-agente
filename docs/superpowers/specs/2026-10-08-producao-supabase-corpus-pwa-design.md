# Produção: auditoria do Supabase, corpus real e modernização PWA

**Data:** 2026-10-08  
**Status:** desenho aprovado em conversa; aguardando revisão da especificação  
**Escopo:** CTB Agente existente

## Objetivo

Levar o estado atual do CTB Agente a uma condição verificável de produção em três frentes:

1. confirmar que o Supabase possui as migrations, permissões e recursos exigidos;
2. carregar o CTB compilado, gerar os vetores e revisar os enquadramentos sem promover dados de exemplo como oficiais;
3. remover a cadeia vulnerável e abandonada do `next-pwa`, mantendo uma PWA instalável com cache seguro por meio do Serwist.

O trabalho não cria um corpus jurídico novo, não corrige automaticamente divergências jurídicas e não inclui um corpus completo para consultas offline. A prioridade é evidência, rastreabilidade e falha segura.

## Critérios de sucesso

- Uma auditoria SQL somente leitura informa, em uma execução, o estado das migrations 001–010 e do hardening 011.
- O relatório confirma extensões, tabelas, colunas, índices, bucket, RLS, políticas e permissões das RPCs relevantes.
- O endpoint de saúde publicado informa `status: ok`, `banco: ok`, `bancoEscrita: ok`, `cache: ok` e `esquemaRag: 10` depois da configuração correta.
- A chave pública não consegue ler cache, IPs bloqueados ou executar RPCs administrativas.
- O CTB compilado pode ser indexado pelo painel e os vetores pendentes podem ser gerados em lotes retomáveis.
- O painel apresenta um relatório de divergências entre os registros de `enquadramentos` e as 411 fichas MBFT incluídas no repositório.
- Nenhum enquadramento é excluído ou sobrescrito automaticamente pelo processo de revisão.
- O aplicativo continua instalável como PWA, mas nenhuma rota de API ou área administrativa é gravada no cache do service worker.
- A auditoria de dependências termina sem vulnerabilidades de severidade alta conhecidas. Avisos moderados sem correção segura são documentados com sua exposição real.
- Typecheck, Jest e build de produção passam. O E2E de navegador roda no CI, onde o Chromium pode ser instalado.

## Restrições e decisões aprovadas

- A conexão externa ao Supabase e à Vercel está bloqueada no ambiente de desenvolvimento atual. A validação do banco será feita por uma consulta executada pelo proprietário no SQL Editor, sem compartilhar novas credenciais.
- O arquivo `data/acervo/mbft-fichas.json`, com 411 fichas, é a fonte operacional principal para os dados presentes no MBFT.
- A tabela `enquadramentos` possui um modelo mais simples que as fichas MBFT e contém campos que não podem ser inferidos com segurança. Ela não será preenchida automaticamente com todas as fichas.
- Os cinco registros do seed são dados de exemplo. Eles serão identificados e comparados, não promovidos, apagados ou corrigidos silenciosamente.
- O PWA continuará existindo. `next-pwa` será substituído pelo Serwist.
- O cache offline desta fase abrange somente shell público e ativos estáticos versionados. Consultas jurídicas e dados administrativos continuam dependentes da rede.

## 1. Auditoria do Supabase

### Artefato

Adicionar um script versionado, por exemplo `scripts/audit-supabase.sql`, composto apenas por consultas de leitura aos catálogos do PostgreSQL e às tabelas acessíveis ao proprietário.

O script deverá produzir uma única linha com um objeto `jsonb`, dividido em seções identificáveis, para que o SQL Editor permita copiar ou exportar todo o diagnóstico de uma vez. Não deverá criar funções temporárias, alterar permissões, aplicar migrations nem gravar resultados no banco.

### Verificações

1. Extensões `vector` e `unaccent`.
2. Tabelas das migrations 001, 002, 007 e 008.
3. Colunas essenciais, inclusive embeddings, registro de documentos e versão do corpus.
4. Índices textuais, vetoriais e índices de apoio esperados.
5. Bucket privado `documentos-pendentes`, limites e tipos permitidos.
6. Funções de busca, rate limit, cache e `rag_schema_version()`.
7. Valor de `rag_schema_version()`, que deve ser `10`.
8. RLS habilitado nas tabelas públicas.
9. Políticas concedidas a `anon` e `authenticated`.
10. Privilégios das funções `SECURITY DEFINER`, com destaque para qualquer execução pública indevida.
11. Contagens de documentos, trechos, dispositivos, enquadramentos e embeddings nulos.
12. Presença dos cinco códigos inseridos por `scripts/seed-corpus.ts`.

### Interpretação

Adicionar um utilitário local que receba o objeto exportado em JSON e apresente `OK`, `ATENÇÃO` ou `BLOQUEIO` para cada item. Ele não receberá URL nem chaves do Supabase.

Quando houver uma lacuna, o relatório apontará o arquivo da migration correspondente. O processo para nessa etapa se faltar RLS, se a versão RAG for inferior a 10 ou se funções privilegiadas estiverem expostas.

### Validação externa

Depois que o proprietário executar a auditoria e corrigir eventuais lacunas, o deploy deverá ser validado pelo `/api/health`. A confirmação final do banco exige evidência do SQL e do healthcheck; sucesso local não substitui essa evidência.

## 2. Carga e revisão do corpus

### Fluxo de carga

O fluxo continuará passando pelas rotas administrativas protegidas:

1. a auditoria do banco fica verde;
2. o administrador abre a Base CTB;
3. o CTB compilado incluído no aplicativo é indexado por `/api/admin/acervo`;
4. a indexação registra documento, trechos, páginas, hash e quantidade sem vetor;
5. `/api/admin/documents/vetores` processa os embeddings em lotes enquanto houver pendências;
6. o painel mostra progresso, falhas retomáveis e a dependência de `MISTRAL_API_KEY`.

O processo não chamará `npm run seed`. Documentos duplicados continuam sendo detectados por hash. Uma nova indexação não deve apagar uma versão válida sem que o fluxo existente de substituição tenha confirmado a nova carga.

### Auditoria do corpus no painel

Adicionar uma rota administrativa de leitura e uma seção visual de revisão. Ambas exigirão sessão válida.

O relatório deverá mostrar:

- estado do CTB compilado e quantidade de trechos;
- documentos por coleção, trechos antigos e possíveis duplicidades;
- total de trechos sem embedding;
- contagem dos enquadramentos no banco;
- existência de cada código do banco nas 411 fichas MBFT;
- divergências normalizadas de descrição, gravidade, pontos e amparo legal;
- campos que não podem ser comprovados pelo MBFT, especialmente valor de multa;
- identificação explícita dos registros provenientes do seed de exemplo.

### Regras de comparação

- Comparar códigos de forma exata depois de normalização de pontuação e espaços.
- A ficha MBFT ganha em campos presentes explicitamente nela.
- Diferenças de acento, caixa ou espaço não são divergências materiais.
- `pontuacao` só vira número quando o texto contiver uma quantidade inequívoca.
- Valores não presentes no MBFT recebem `revisao_humana`, nunca um valor inferido.
- A saída é consultiva. Edição e exclusão continuam no CRUD atual do painel.

### Erros e retomada

- Migration ausente: bloquear carga e indicar o arquivo necessário.
- Chave de embedding ausente: manter busca textual e mostrar vetores pendentes.
- Falha parcial do provedor: preservar trechos já indexados e permitir retomar o lote.
- Divergência jurídica: mostrar ambos os valores e não alterar o banco.

## 3. PWA e dependências

### Atualização da stack

- Atualizar Next.js para a versão estável corrigida compatível com o projeto e ajustar mudanças obrigatórias da versão 16.
- Manter React 19 em versão suportada pela versão escolhida do Next.js.
- Remover `next-pwa` e dependências transitivas antigas.
- Adicionar `@serwist/next`, `@serwist/cli` e os pacotes exigidos pela integração selecionada.
- Atualizar PostCSS e garantir uma versão de Sharp sem o alerta de severidade alta.

Não será aceito `npm audit fix --force` sem revisão. Downgrades sugeridos pelo npm que reintroduzam versões antigas, como no caso de parsers de documento, serão rejeitados.

### Service worker

Usar um service worker fonte mantido no repositório e compilado pelo Serwist. O arquivo gerado não será versionado.

Regras:

- pré-cache somente de artefatos estáticos produzidos pelo build e da página offline;
- cache de ícones, fontes, CSS e JavaScript com nomes separados e expiração definida;
- navegação pública pode usar fallback offline apenas para o shell aprovado;
- `/api/**` usa `NetworkOnly` sem fallback de cache;
- `/admin/**` usa `NetworkOnly` e nunca entra no precache;
- login, sessão, healthcheck, uso, consultas, respostas jurídicas e PDFs gerados não são cacheados;
- caches conhecidos do `next-pwa` são removidos durante a ativação;
- a troca de versão assume controle dos clientes depois da instalação do novo worker;
- a página offline deixa explícito que consultas e dados jurídicos atuais exigem conexão.

### Arquivos gerados

`public/sw.js`, arquivos Workbox antigos e equivalentes gerados serão removidos do controle de versão e ignorados. O build da Vercel será responsável por gerá-los. Isso evita diffs de hash e manifests obsoletos no repositório.

### Segurança do cache

Os testes devem falhar se uma regra futura tentar armazenar `/api`, `/admin`, healthcheck ou endpoints personalizados. O logout não dependerá da limpeza do service worker porque respostas administrativas nunca terão sido armazenadas.

## Testes e verificação

### Banco e corpus

- Testes unitários do interpretador da auditoria com resultados completos, incompletos e inseguros.
- Testes da comparação MBFT para igualdade normalizada, divergência real e campo não verificável.
- Testes das rotas administrativas para sessão, banco ausente e falha parcial.
- Testes de lote de embeddings com retomada.

### PWA

- Teste da configuração de cache, garantindo `NetworkOnly` para APIs e admin.
- Teste da página offline.
- Build de produção com geração do worker.
- Inspeção automatizada do worker produzido para impedir padrões proibidos.
- E2E no CI para instalação/ativação, navegação pública offline e ausência de resposta administrativa em cache.

### Comandos de aceitação

```bash
npm run typecheck
npm test -- --runInBand
npm run build
npm audit --omit=dev --audit-level=high
npm run test:e2e
```

Os testes locais devem limpar ou controlar `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH`, evitando que credenciais herdadas alterem o resultado da suíte.

## Implantação e rollback

1. Aplicar primeiro eventuais migrations apontadas pela auditoria e repetir a consulta.
2. Fazer deploy da atualização de dependências e PWA em Preview.
3. Executar build, smoke e E2E contra Preview.
4. Promover para produção.
5. Confirmar o healthcheck publicado.
6. Indexar o CTB compilado.
7. Gerar vetores até a contagem pendente chegar a zero ou registrar a limitação do provedor.
8. Revisar o relatório de enquadramentos e corrigir cada divergência aprovada por uma pessoa responsável.

Rollback de aplicação usa promoção do deployment anterior. O novo service worker deve remover caches antigos e usar nomes versionados, de modo que um rollback não reutilize respostas de API. Operações de corpus exigem backup do Supabase e registro do documento substituído antes de qualquer exclusão manual.

## Fora de escopo

- Aplicar migrations automaticamente no banco de produção.
- Armazenar credenciais no repositório ou no relatório de auditoria.
- Importar automaticamente 411 fichas para `enquadramentos`.
- Decidir juridicamente qual divergência está correta.
- Fine-tuning de modelos.
- Corpus jurídico completo disponível offline.
- Monitor legislativo e notificações de projetos de lei.

