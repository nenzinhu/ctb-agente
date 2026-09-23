# CTB Agente — Especificação de Design

**Data:** 2026-09-21  
**Versão:** 1.0 (aprovada)  
**Público-alvo:** Agentes de trânsito (PM, PC, prefeitura, PRF)  
**Escopo:** Consulta de legislação de trânsito com RAG, enquadramentos MBFT e geração de PDF temático

---

## 1. Visão Geral

**CTB Agente** é um assistente web para agentes de trânsito que centraliza a legislação de trânsito brasileira (CTB, resoluções, portarias, jurisprudência, MBFT) e responde em linguagem técnica ou simples. O usuário consulta uma situação ("moto sem retrovisor") ou um código ("516-91") e recebe um cartão estruturado com:

- Enquadramento (código, gravidade, pontos, valor, medidas administrativas)
- Explicação técnica e em palavras simples
- Citações validadas contra o texto da lei
- Checklist do AIT, erros comuns, jurisprudência relacionada
- Opção de gerar dossiê em PDF com normas, exemplos e PLs em tramitação

A precisão e a confiabilidade são o núcleo: tudo o que tem efeito jurídico (código, valor, medidas) vem do banco de dados, nunca da IA. A IA organiza, explica e exemplifica.

---

## 2. Arquitetura

```
┌──────────────── PWA Next.js 15 (Vercel) ──────────────┐
│ Frontend:                                              │
│  / [página principal]                                  │
│  /artigo/[id] [dispositivo + versões + remissões]     │
│  /admin [painel master: upload, corpus, provedores]   │
│  /gerador-pdf [aba Gerar PDF]                         │
└────────────────┬─────────────────────────────────────┘
                 │ API Routes (/api/*)
   ┌─────────────┼──────────────────────────────────────┐
   │ Guardrails  │ rate limit (30/IP/hora)              │
   │ + Roteador  │ Turnstile (anti-bot)                 │
   │ + Busca     │ filtro PII (placa, CPF, nome)        │
   │ + Gerador   │ pergunta simples? → SQL direto       │
   │ + Validador │ híbrida: tsvector (pt) + pgvector    │
   │             │ cadeia de LLMs gratuitos c/ fallback │
   │             │ validação de citações                │
   └─────────────┼──────────────────────────────────────┘
                 │
      Supabase / PostgreSQL (com pgvector):
      - tabela `dispositivos` (art, §, inc, alínea, texto, versão, vigência)
      - tabela `enquadramentos` (código MBFT, gravidade, pontos, valor, medidas)
      - tabela `remissoes` (grafo: art X → Res Y, art Z)
      - tabela `jurisprudencia` (decisão, resumo, tema, data)
      - tabela `cache_respostas` (hash pergunta → resposta completa)
      - tabela `uso_diario` (consultas por IP, timestamp)
      - índice tsvector em português
      - índice pgvector para embeddings
```

### 2.1 Fluxo de consulta

```
[Agente digita] → "moto sem retrovisor"
                ↓
          [Roteador]
            ├─ É código (5XX-XX)? → Busca SQL direto em enquadramentos
            ├─ É artigo (art XXX)? → Busca SQL direto em dispositivos
            └─ É situação? → [Busca Híbrida]
                ↓
        [Busca Híbrida]
        ├─ tsvector (BM25 português) → top 20
        ├─ pgvector + embedding → top 20
        ├─ reranking (score + recência + citabilidade) → top 5
        └─ → [Gerador de Resposta]
                ↓
        [Gerador de Resposta]
        ├─ Cache hit? → retorna na hora
        ├─ Senão:
        │  ├─ Prompt: "Com base nesses trechos, responda como agente de trânsito"
        │  ├─ Cadeia de LLMs: Groq → NVIDIA → OpenRouter free
        │  ├─ Estrutura: campo jurídico (código, gravidade, medida) + explicação + exemplo
        │  └─ → [Validador]
        └─ → [Validador]
                ↓
        [Validador]
        ├─ Toda citação existe no trecho recuperado?
        ├─ Se não: tira a citação ou regera com outro modelo
        └─ → [Resposta Final]
                ↓
          [Resposta Final]
          Cartão estruturado + explicação + checklist do AIT
```

### 2.2 Fluxo de upload (painel master)

```
[Master faz upload de PDF] → "CTB_compilado.pdf"
                    ↓
            [Extração de Texto]
            ├─ PDF → texto + metadados (OCR se preciso)
            ├─ Detecção de tipo (CTB, Resolução, Jurisprudência)
            └─ → [Parser de Dispositivos]
                    ↓
        [Parser de Dispositivos]
        ├─ Quebra por estrutura: Art › § › Inciso › Alínea
        ├─ Extrai metadados: nº lei, data, órgão, ementa
        ├─ Detecta remissões ("art. 270", "Res. 432/2013")
        ├─ Detecta "revoga" → marca vigência afetada
        ├─ Gera embeddings (Mistral/NVIDIA gratuito)
        └─ → [Tela de Revisão]
                    ↓
        [Tela de Revisão — Master]
        ├─ Visualiza cada dispositivo extraído
        ├─ Corrige divisões, metadados, remissões
        ├─ Botão [Publicar]
        └─ → [Índices Atualizados]
                    ↓
        [Índices Atualizados]
        ├─ Atualiza tsvector em português
        ├─ Atualiza embeddings no pgvector
        ├─ Atualiza grafo de remissões
        └─ Cache de respostas é zerado (precisa revalidar)
```

---

## 3. Dados e Corpus

### 3.1 Estrutura das tabelas

**`dispositivos`** (CTB, resoluções, portarias, MBFT anotações)
```
id (UUID)
numero_dispositivo (text) — "art. 165" ou "art. 165 § 1º" ou "art. 165 I a"
texto (text) — texto literal
norma_id (FK) — qual lei, resolução ou portaria
tipo (enum) — lei | resolução | portaria | jurisprudência | manual
data_publicacao (date)
data_vigencia_inicio (date)
data_vigencia_fim (date) — NULL se vigente
embedding (vector(1536)) — pgvector
tsvector_pt (tsvector) — índice full-text em português
citacoes_dentro (jsonb) — ["art. 270", "Res. 432/2013", ...]
criado_em (timestamp)
atualizado_em (timestamp)
```

**`enquadramentos`** (MBFT + desdobramentos)
```
id (UUID)
codigo_mbft (text, unique) — "516-91"
desdobramento (int) — 0, 1, 2, ... para desenrolar um código
descricao (text) — "Estacionar em local proibido"
gravidade (enum) — leve | média | grave | gravíssima
pontos (int) — 0, 3, 4, 5, 7
valor_multa (decimal) — em R$
unidade (text) — "UIRF" ou "UFIR" (ajusta por inflação)
retem_veiculo (boolean)
remove_veiculo (boolean)
recolhe_documento (enum) — null | cnh | crlv | ambos
amparo_legal (text) — "art. 181 XVII do CTB"
medida_administrativa (text) — "retenção do veículo" ou "liberação imediata"
responsavel (enum) — condutor | proprietário | ambos
criado_em (timestamp)
```

**`jurisprudencia`**
```
id (UUID)
tipo (enum) — stj | tj | cetran | jari
numero (text) — "REsp 1234567" ou "Acórdão CETRAN 2023"
ementa (text)
resumo (text) — 2-3 linhas
data_decisao (date)
tema (text) — "alcoolemia" | "estacionamento" | ...
dispositivos_relacionados (text[]) — ["art. 165", "art. 306"]
link_oficial (url) — link para TJ, STJ ou tribunal
criado_em (timestamp)
```

**`cache_respostas`**
```
id (UUID)
hash_pergunta (text, unique) — SHA256 da pergunta normalizada
pergunta_original (text)
resposta_completa (jsonb) — cartão estruturado + explicação
modelo_usado (text) — "groq/mixtral" | "nvidia/llama" | ...
tempo_geracao_ms (int)
citacoes_validadas (boolean)
data_criacao (timestamp)
data_ultimo_acesso (timestamp)
ttl_dias (int) — 30 dias por padrão, zerado se corpus muda
```

**`uso_diario`**
```
id (UUID)
ip_endereco (text)
timestamp (timestamp)
tipo_consulta (enum) — código | artigo | situacao
cache_hit (boolean)
modelo_ia_usado (text)
sucesso (boolean)
tempo_ms (int)
```

### 3.2 Corpus inicial

| Documento | Formato | Origem | Responsável |
|-----------|---------|--------|---|
| CTB compilado (Lei 9.503/97 + alterações até 2026) | PDF | Planalto.gov.br | Robô semanal |
| MBFT (Manual Brasileiro de Fiscalização de Trânsito) | PDF | SENATRAN | Master (upload) |
| Resoluções CONTRAN | PDF/HTML | CONTRAN | Master (upload) |
| Portarias SENATRAN | PDF/HTML | SENATRAN | Master (upload) |
| Jurisprudência (STJ, TJs, CETRAN, JARI) | Texto/ementa | Master adiciona | Master (manual) |

---

## 4. Formato da Resposta

Toda consulta que retorna um enquadramento gera um **Cartão Estruturado** em JSON:

```json
{
  "tipo": "enquadramento",
  "sucesso": true,
  "enquadramento": {
    "codigo_mbft": "516-91",
    "infracacao": "Estacionar em local proibido",
    "amparo_legal": "art. 181, inciso XVII do CTB",
    "gravidade": "gravíssima",
    "pontos": 7,
    "valor_multa": "R$ 293,47",
    "unidade": "UIRF 2026",
    "retem_veiculo": false,
    "remove_veiculo": true,
    "recolhe_documento": "CRLV",
    "liberacao_no_local": {
      "possivel": false,
      "motivo": "Art. 270: remoção obrigatória quando vaga de idoso, deficiente ou zona azul",
      "citacao_validada": true
    }
  },
  "checklist_ait": [
    "[ ] Descrever a localização exata (via, nº, referência)",
    "[ ] Fotografar o veículo e a sinalização",
    "[ ] Anotar hora e data",
    "[ ] Especificar motivo da proibição (zona azul, vaga idoso, etc.)"
  ],
  "erros_comuns": [
    "❌ NÃO usar este código quando o carro está em movimento",
    "❌ Sem fotografia da sinalização, o auto é anulável",
    "⚠️ Zona azul municipal pode ter outras regras — consultar específica"
  ],
  "concurso_infrações": [
    "Ver também: 518-51 (estacionamento em fila de táxi)",
    "NÃO pode ser lavrado junto com: 517-93 (deixar de remover)"
  ],
  "crime_transito": null,
  "categoria_cnh_exigida": "qualquer",
  "normas_relacionadas": [
    "Res. CONTRAN 432/2013 (procedimento de remoção)",
    "Port. SENATRAN 2345/2014 (operacionalização)"
  ],
  "jurisprudencia": [
    {
      "tipo": "STJ",
      "numero": "REsp 1.234.567",
      "ementa": "Falta de fotografia da sinalização enseja nulidade do auto",
      "link": "..."
    }
  ],
  "explicacao_simples": "Você estacionou em um lugar onde não é permitido, por exemplo uma vaga de idoso, uma zona azul ou uma fila de táxi. Neste caso, o carro é removido para o pátio credenciado e você recebe uma multa de R$ 293,47. É possível se defender na JARI se faltar fotografia da placa ou da sinalização, ou se o carro foi removido ilegalmente.",
  "exemplo_dia_a_dia": "Um motorista estaciona em uma vaga de idoso no estacionamento de um mercado, sem credencial visível. O agente aborda, constata a infração, tira foto do veículo e da sinalização da vaga. Lava o auto de infração com o código 516-91. O proprietário tem 15 dias para se defender na JARI com a documentação ou pagar a multa com 50% de desconto.",
  "citacoes": [
    {
      "trecho": "Art. 181. Estacionar o veículo...",
      "dispositivo": "art. 181 XVII do CTB",
      "validada": true
    }
  ],
  "timestamp": "2026-09-21T10:30:00Z"
}
```

Quando exibido na tela, vira dois **blocos de apresentação**:

- **Bloco Técnico:** campos estruturados (código, gravidade, medidas, checklist, erros comuns, crime).
- **Bloco Explicado:** `explicacao_simples` + `exemplo_dia_a_dia` + botão "Ver citações".

---

## 5. Aba Gerar PDF (Dossiê Temático)

Acessada via botão na barra de navegação, permite ao agente (ou master) escolher um tema e gerar um PDF com:

| Seção | Conteúdo | Fonte | Garantia |
|---|---|---|---|
| **Capa** | Tema, data, versão da base | — | — |
| **Normas aplicáveis** | Trechos literais do CTB, resoluções, portarias | RAG | Texto exato, com número do dispositivo |
| **Enquadramentos** (cartões) | Código MBFT, gravidade, medidas, liberação | Tabela `enquadramentos` | Dados estruturados do banco |
| **Diretrizes de procedimento** | Passo a passo, checklist do AIT | RAG + IA | Citações validadas |
| **Exemplos do dia a dia** | 3-4 cenários realistas | IA | Marcados como "ilustrativo" |
| **Jurisprudência** | Decisões cadastradas sobre o tema | Tabela `jurisprudencia` | Somente decisões na base; senão "nenhuma cadastrada" |
| **Projetos de lei em tramitação** | PLs que mexem com a lei 9.503/97 no tema | APIs Câmara/Senado (dados.gov) | Número, ementa, status, link oficial; tarjeta "PROPOSTA — não é lei vigente" |
| **Rodapé** | Data, versão da base, aviso "material de apoio" | — | — |

**Geração:**
- Usuário seleciona tema (dropdown com temas pré-definidos: "Alcoolemia", "Estacionamento", "Art. 181", etc.).
- Marca seções desejadas (checkboxes).
- Clica "Gerar PDF".
- Server busca os dados, monta o PDF com `@react-pdf/renderer`, e oferece download.
- PDFs são cacheados (1 semana) se nada mudar na base; nova versão invalida o cache.

---

## 6. Painel Master (`/admin`)

Protegido por login Supabase (conta `nenzinhu`, senha em `.env.local` com hash bcrypt).

### 6.1 Abas do painel

**1. Documentos**
- Lista de uploads: nome, tipo (CTB, Resolução, etc.), status (rascunho | publicado), data.
- Ações: revisar (abre tela de parser), reprocessar, despublicar, deletar.
- Upload novo: arrasta PDF/DOCX/TXT, vira rascunho automático.

**2. Enquadramentos**
- Tabela editável do MBFT com todos os campos (código, gravidade, pontos, valor, medidas).
- Adicionar novo enquadramento ou desdobramento.

**3. Provedores de IA**
- Tabela: provedor, modelo, status (ativo | inativo), teste ping.
- Editar ordem da cadeia de reserva.
- Teste de conectividade.

**4. Uso**
- Gráfico: consultas por dia (últimos 30 dias).
- Taxa de cache hit.
- Provedores que falharam, com logs.
- **Perguntas sem resposta:** perguntas que não encontraram resultado relevante ou onde a IA se recusou. Isso mostra lacunas da base.

**5. Limites**
- Slider: consultas/IP/hora (padrão 30).
- Toggle: Turnstile ativo ou inativo.
- Listar IPs bloqueados (exceções).

---

## 7. Camada de IA Plugável

### 7.1 Provedores e modelos

Cada provedor tem um adaptador que:
1. Lista modelos disponíveis (via `/models` ou similar).
2. Filtra só os gratuitos.
3. Oferece uma função `generate(prompt, model, max_tokens)` genérica.

**Cadeia padrão (ordem de tentativa):**

```
Resposta rápida (enquadramento):
  Groq (mixtral, llama)
    → NVIDIA NIM (llama, qwen)
    → OpenRouter :free (gpt-3.5-turbo, mistral)

Resposta analítica (jurisprudência, complexa):
  OpenRouter :free (llama 3.2, mistral)
    → Mistral (plano free)
    → NVIDIA NIM

Embeddings:
  Mistral (mistral-embed)
    → NVIDIA (bge-m3, nv-embed)
    → Modelo local no servidor (Sentence Transformers) como último recurso
```

Se um provedor falha, tenta o próximo. Se todos falharem, retorna só os dados do banco (sem IA).

### 7.2 Interface de provedores

```typescript
interface AIProvider {
  name: string;
  getModels(): Promise<Model[]>;
  generate(
    prompt: string,
    model: string,
    max_tokens: number
  ): Promise<string>;
  getEmbedding(text: string): Promise<number[]>;
}
```

---

## 8. Validação de Citações

Após a IA gerar uma resposta, o validador:

1. Extrai cada citação (ex: "art. 165, §1º do CTB").
2. Busca o trecho no banco de dados.
3. Confere se o trecho *realmente* diz o que a citação afirma.
4. Se não existir ou contradizer: marca como ⚠ "não verificada" e tira da resposta, ou regera com outro modelo.

**Implementação:** função `validateCitations(response, retrievedChunks)` que retorna `{valid: boolean, issues: string[]}`.

---

## 9. Segurança e Privacidade

### 9.1 Rate limiting

- 30 consultas por IP por hora (configurável no `/admin`).
- Cache de respostas economiza chamadas.
- Turnstile ativável para volumes suspeitos.

### 9.2 Filtro de PII

Antes de enviar pergunta à IA:
- Mascara placa (ABC-1234 → ****).
- Mascara CPF/CNPJ.
- Mascara nome próprio (opcional, deixa só primeiro nome).
- Mantém só o contexto relevante (tipo de veículo, condição).

### 9.3 Dados do master

- Senha: configurada no primeiro acesso via `.env.local`, guardada como hash bcrypt no Supabase Auth (`.env.local` é git-ignored).
- Chaves de API: apenas em `.env.local` (git ignore) e em variáveis de ambiente da Vercel (secrets).
- Acesso ao `/admin`: obrigatório login Supabase com credenciais configuradas.

### 9.4 Repositório privado

- GitHub privado (`nenzinhu/ctb-agente`).
- Não expõe chaves nem senhas em histórico.
- `.env.local` e `*.secrets*` no `.gitignore`.

---

## 10. Testes

### 10.1 Unitários

- **Parser:** dividir artigos, parágrafos, incisos, alíneas (exemplo: extrair "art. 165 § 1º IV c" de um texto desordenado).
- **Remissões:** detectar "art. 270", "Res. 432/2013" em um trecho.
- **Roteador:** identificar se é código (5XX-XX), artigo (art XXX) ou situação.
- **Rate limit:** contar consultas por IP e bloquear na 31ª.

### 10.2 Testes E2E

- Upload de PDF → revisão → publicação.
- Consulta "estacionado em vaga de idoso" → cartão com código correto.
- Consulta "código 516-91" → resultado direto do banco.
- Geração de PDF temático → arquivo estruturado e sem erros.

### 10.3 Conjunto de avaliação

~50 perguntas com resposta esperada conhecida (tiradas de casos reais, provas do DETRAN, CETRAN):

```
Pergunta: "Motocicleta com guidom acima da altura do ombro"
Código esperado: 517-32 (gravíssima, 7 pts, R$ 170,56)
Validação: código correto? Citação valida? IA se recusa quando não há base?
```

Rodada a cada mudança de modelo ou prompt. Métrica: acerto ≥ 95%.

---

## 11. Deployment

- **Front-end:** Vercel (Next.js 15).
- **Banco:** Supabase (PostgreSQL + pgvector).
- **Variáveis de ambiente:** Vercel secrets (chaves de IA, URL do Supabase, password hash).
- **CI/CD:** GitHub Actions (lint, testes, build, deploy automático no merge de `main`).

---

## 12. MVP (Mínimo Viável) vs. Roadmap

### MVP (v1.0)

- ✅ Consulta de enquadramento (situação + código + artigo).
- ✅ Cartão estruturado com explicação.
- ✅ Dois blocos (técnico + simples).
- ✅ Checklist do AIT, erros comuns, jurisprudência.
- ✅ Painel master (upload, revisão, provedores).
- ✅ Voz (transcrição Groq).
- ✅ Modo sol (alto contraste).

### Roadmap (v1.1+)

- Aba Gerar PDF.
- Jurisprudência integrada (master enriquece a base).
- Monitor de PLs em tramitação.
- Avaliação automática (50 testes).
- ✅ Favoritos salvos no aparelho (`/favoritos`, localStorage).
- ✅ Compartilhamento de cartão (texto + link, share sheet nativo ou cópia).

---

## 13. Checklist de Implementação

- [ ] Infraestrutura: Supabase + Vercel + GitHub privado.
- [ ] Banco de dados: tabelas, índices (tsvector, pgvector).
- [ ] Parser: extração de dispositivos e metadados.
- [ ] Roteador: identificação de tipo de consulta.
- [ ] Busca híbrida: BM25 + embeddings + reranking.
- [ ] Cadeia de LLMs: adaptadores para Groq, NVIDIA, OpenRouter, Mistral.
- [ ] Validador de citações.
- [ ] Frontend: PWA, layout (cores verde/branco), cartão, buttons.
- [ ] Painel `/admin`: login, upload, revisão, provedores, uso.
- [ ] Testes: unitários + E2E + conjunto de avaliação.
- [ ] Segurança: rate limit, Turnstile, filtro PII, rate limit, secrets.
- [ ] Documentação: README, contributing, deployment.

---

## Fim da Especificação

Aprovado para início da implementação. Próximo passo: invocar `writing-plans` para criar o plano de implementação detalhado.
