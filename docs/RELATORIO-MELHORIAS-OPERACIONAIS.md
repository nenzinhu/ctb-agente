# CTB Agente — melhorias operacionais

Alterações locais realizadas a partir do documento enviado pelo usuário. Não houve commit, push, deploy, alteração de segredos ou configuração de produção.

## Áreas implementadas

| Área | Implementação | Arquivos principais |
| --- | --- | --- |
| Requisições | Timeout cobre transporte e leitura JSON, cancelamento efetivo, erros classificados e limpeza de timers/listeners | `lib/client/request.ts` |
| CTB e POP | Estados terminais, nova tentativa, validação de respostas, cancelamento por desmontagem e proteção contra respostas antigas | `app/consulta/content.tsx`, `components/ConsultaForm.tsx`, `components/pop/PopConsulta.tsx` |
| Biblioteca e manual POP | Erro separado de biblioteca vazia/banco ausente; nova tentativa; consulta direta ao manual local; validação das seções antes de renderizar | `components/pop/PopBiblioteca.tsx`, `components/pop/PopConsulta.tsx` |
| Professor, Casos e Pesos | Prazo de espera, cancelamento, entrada preservada, nova tentativa e alternativas de consulta à fonte | `components/Professor.tsx`, `components/CasosPraticos.tsx`, `components/pesos-dimensoes/` |
| Apostilas | Catálogo com erro/timeout/nova tentativa, validação de resposta; geração com orçamento próprio e preservação do formulário | `components/GerarApostila.tsx` |
| Celular | Atalhos visíveis CTB/POPs/Fatos e diálogo com todos os módulos, sem depender de rolagem horizontal; página ativa, foco e Escape | `components/Header.tsx`, `components/NavTabs.tsx`, `components/mobile/MobileNavigation.tsx`, `app/globals.css` |
| Fatos e Estrangeiros | Versão original, conferência registrada e pendência de revisão diferenciadas; página/trecho e fonte quando disponíveis; falha remota e fallback local identificados | `components/fatos-pmsc/FatosPmscConsulta.tsx`, `components/estrangeiros/` |
| Histórico local | Gravação automática somente de códigos MBFT e referências de artigos; rejeição de descrições livres; remoção de texto livre legado; explicação e limpeza | `lib/search/local-storage.ts`, `components/RecentQueries.tsx` |
| Favoritos | Ação explícita preservada; fonte/amparo quando presentes; salvamento não apresentado como revisão jurídica; recusa de exclusão não simula sucesso | `lib/favorites/favorites.ts`, `app/favoritos/page.tsx` |

Os avisos e links das fontes usam os tokens de contraste existentes, inclusive nos modos escuro e sol. Voz, instalação, rotas, contratos das APIs e conteúdo jurídico foram preservados. Não foram adicionadas dependências ao projeto.

## Diagnóstico dos carregamentos

Foram confirmados defeitos locais: consultas e bibliotecas usavam requisições sem timeout/cancelamento; algumas respostas HTTP 200 malformadas podiam deixar a tela sem conteúdo ou provocar erro de renderização. Testes com requisições que não terminam reproduziram esses estados antes das correções. A revisão final também reproduziu um manual POP com `{}` que derrubava a renderização, corrigido com validação dos campos e seções.

Na reprodução local de referência, os serviços responderam rapidamente:

| Consulta | Resultado de referência |
| --- | --- |
| CTB: moto sem capacete | HTTP 200, ficha MBFT real, aproximadamente 0,24 s |
| POP: Revista pessoal | HTTP 200, aproximadamente 0,14 s |
| Biblioteca POP | HTTP 200 em aproximadamente 0,008 s, informando banco não configurado |
| Fatos: som alto | HTTP 200 em aproximadamente 0,109 s |
| Estrangeiros: argentino com carteira vencida | HTTP 200 em aproximadamente 0,017 s |

Os atrasos de 13/28 segundos e a falha da biblioteca vistos em produção **não foram reproduzidos**. Sem os serviços/configurações e logs desse ambiente, a causa externa desses episódios permanece indeterminada. As correções garantem uma saída compreensível no cliente e não simulam resposta jurídica quando um serviço falha.

O teste com JavaScript retido também reproduziu entrada antes da hidratação: o campo aceitava texto sem os eventos do aplicativo estarem prontos. O formulário CTB agora só habilita a entrada quando está pronto, preservando o texto ao trocar de atalho; o cenário foi validado em desktop e celular.

Prazos definidos: 15 segundos para consultas comuns e catálogos; 25 segundos para POP, permitindo o fallback de 18 segundos existente no servidor; 30 segundos para Professor; 65 segundos para geração de apostila, respeitando o orçamento maior desse fluxo.

## Fontes e dados locais

- A versão de Fatos continua sendo a data real de origem, **10/06/2019**. Não foi inventada uma revisão posterior.
- A data de conferência registrada no acervo de Estrangeiros não é apresentada como validação jurídica. Fontes com situação `revisar` e sem URL oficial mantêm avisos visíveis.
- Texto livre não é gravado automaticamente no histórico local. Favoritos continuam dependendo de ação explícita e ficam no aparelho.
- A política PWA existente permanece: APIs, administração, sessões e navegações com consulta ficam fora do cache público. Não foi adicionado armazenamento offline de respostas privadas.

## Modelo vetorial Nemotron

Também foi concluído o pedido anterior: **NVIDIA: Nemotron 3.5 Embed 8B (free)** aparece como modelo vetorial principal no painel RAG, via `OPENROUTER_API_KEY`. Há seleção persistida e teste administrativo com frase sintética.

Os novos vetores ficam separados dos vetores Mistral existentes. A migração aditiva está em `scripts/migrations-015-nemotron-embeddings.sql`. Ela não apaga nem converte os vetores antigos. Consultas, indexação, geração de pendentes e estatísticas usam o espaço do modelo escolhido.

Para ativação no ambiente publicado, ainda será necessário aplicar a migração 015 e ter a chave configurada, depois gerar os vetores pendentes. A chave está ausente neste executor; a Vercel negou a consulta aos metadados das variáveis por falta de acesso à equipe. A conexão ao modelo real não foi testada. Nenhuma mudança remota foi feita no banco ou nas configurações.

Referências técnicas: [modelo no OpenRouter](https://openrouter.ai/nvidia/nemotron-3.5-embed-8b:free), [API de embeddings](https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings).

## Verificação

- `npm test -- --runInBand`: **150 suítes, 1.126 testes aprovados**.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado, incluindo geração do service worker.
- `git diff --check`: aprovado.
- `E2E_BASE_URL=http://localhost:3211 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test --workers=2`: **62 aprovados e 8 ignorados**, sem falhas. Os ignorados são seis verificações com base populada e dois logins que exigem senha administrativa de teste.
- Sintaxe da migração 015 validada por parser PostgreSQL; consulta de estatísticas executada em PostgreSQL embutido isolado com dados sintéticos para verificar a separação de CTB, MBFT, POP, Fatos e Estrangeiros.
- O projeto não oferece script de lint; não foi criado nem alegado um lint inexistente.

Os testes de navegador usam o build de produção local e Chromium. Incluem navegação e foco em 320/360/390/768 px, temas, consulta real aos manuais, rede indisponível, timeout, nova tentativa, biblioteca, favoritos, histórico, PDF e proteção administrativa. Os cenários que exigem banco populado e senha administrativa de teste permanecem condicionados ao ambiente; não foram substituídos por dados falsos em produção.

## Pendências externas

- A causa dos atrasos no ambiente publicado permanece não determinada; os endpoints locais responderam normalmente e os estados problemáticos foram reproduzidos por requisições controladas.
- Nemotron real depende de confirmar `OPENROUTER_API_KEY`, aplicar a migração 015 e gerar os vetores próprios do modelo. Não foi possível confirmar as variáveis de produção com a conexão disponível.
- A API da Câmara apresentou falha de DNS (`EAI_AGAIN`) neste ambiente durante o fluxo de PDF. Não foram fabricados projetos de lei nem alteradas regras jurídicas para contornar a indisponibilidade.
- A validação com banco populado e credenciais reais deve ser feita pelo responsável pelo ambiente, sem compartilhar segredos no código.
