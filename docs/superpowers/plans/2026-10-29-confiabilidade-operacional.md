# Melhorias de confiabilidade e uso em campo

Origem: documento do usuário `Texto colado.txt`, fornecido em 29/10/2026. O pedido determina inspecionar, apresentar plano e implementar; proíbe commits, push, publicação e alterações de produção.

## Inspeção e diagnóstico
- Next.js 16/React 19, App Router, APIs no próprio repositório, Supabase/pgvector, manuais locais e componentes compartilhados. Temas por tokens CSS, navegação inferior com diálogo e PWA Serwist já existem.
- Consulta CTB, pergunta POP e biblioteca tinham `fetch`/leitura JSON sem prazo e sem cancelamento por desmontagem. Resposta CTB sem `card` podia terminar em tela vazia. Biblioteca não oferecia nova tentativa. Falhas foram reproduzidas com requisições controladas que não terminam.
- No servidor local de referência, CTB “moto sem capacete” retornou ficha real em cerca de 0,24 s; POP “Revista pessoal” em 0,14 s; biblioteca respondeu em 0,008 s indicando banco não configurado. Os atrasos de 13/28 s e o erro de produção descritos não foram reproduzidos; não há acesso aos serviços/configurações de produção para determinar sua causa.
- No celular, a faixa superior dependia de rolagem horizontal e o menu inferior não incluía Casos práticos. Há padrões de diálogo já utilizáveis.
- Fatos usa versão real 10/06/2019. Estrangeiros possui fontes com situação `revisar`; a data registrada de conferência não equivale à validação jurídica. O fallback local de Estrangeiros ocultava falhas remotas.
- Consultas recentes gravavam automaticamente qualquer texto no localStorage; favoritos já eram explícitos e locais, com remoção individual e total.

## Plano em execução
- [x] Requisições de consulta/biblioteca com prazo, cancelamento e estados terminais distintos; nova tentativa e alternativa ao manual local.
- [x] Navegação móvel com acessos rápidos visíveis e diálogo completo de módulos, mantendo rotas e desktop.
- [x] Fonte, versão original, página e pendências de revisão visíveis sem inventar atualização; fallback local identificado como tal.
- [x] Histórico automático limitado a identificadores legais, limpeza dos textos livres legados, aviso de armazenamento local e remoção honesta; favoritos com contexto da fonte e ressalva de vigência.
- [x] Testes de comportamento, suíte completa, TypeScript, build, verificação visual móvel/desktop e revisão final. Sem lint adicional porque o projeto não oferece script de lint.

## Limites
Não alterar conteúdo ou regras jurídicas, não criar simulações em produção e não adicionar cache de respostas privadas/sessões. Preservar voz, instalação, modo sol e escuro. A configuração Nemotron já concluída permanece local e depende da migração 015/chave em produção; não tentar contornar a falta de acesso externo.

## Verificação e decisões finais
- Requisições padrão limitadas a 15 s; POP tem 25 s para permitir o fallback do servidor em 18 s; Professor tem 30 s; geração de apostila tem 65 s para comportar o orçamento do servidor.
- Manual POP valida campos e seções antes de renderizar, incluindo respostas HTTP 200 malformadas e referências relacionadas.
- Migração/configuração Nemotron permanece conforme plano próprio; produção não alterada.
- Histórico local conserva somente identificadores legais; textos livres antigos são removidos na leitura. Favoritos continuam explícitos e locais; falhas de remoção não anunciam sucesso.
- A política PWA existente foi preservada: APIs, administração, sessões e navegações com consulta continuam fora do cache público.
- 150 suítes / 1126 testes Jest aprovados. TypeScript e build de produção aprovados. Sintaxe SQL validada e estatísticas testadas em PostgreSQL embutido isolado.
- Revisão independente encontrou e corrigiu validação de POP malformado. Nenhum dado jurídico ou metadado original foi modificado.

- Verificação final E2E: 62 aprovados e 8 ignorados por dependência de base populada/credenciais. Formulário CTB também protegido contra digitação anterior à hidratação, com regressão reproduzida e teste navegador aprovado.
- Relatório final: `docs/RELATORIO-MELHORIAS-OPERACIONAIS.md`.
