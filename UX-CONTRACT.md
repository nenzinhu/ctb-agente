# Contrato de interação — CTB Agente

Idioma: português brasileiro. A identidade e os tokens estão em [DESIGN.md](DESIGN.md). Este contrato registra os comportamentos compartilhados da pesquisa, do login e da rolagem; não altera regras legais ou permissões.

## Fontes de comportamento

- `README.md`: público, consulta CTB/POPs e fontes oficiais.
- `app/api/admin/login/route.ts` e `lib/auth/admin.ts`: configuração, autenticação e autorização são verificadas no servidor.
- `lib/client/request.ts`: cancelamento, espera limitada e mensagens das consultas.
- `lib/client/reading-mode.ts`: preferência de leitura salva no aparelho.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | `components/ui/Field.tsx` e handlers das consultas/login | Este contrato e APIs correspondentes | pesquisa com limpeza; login com erro junto ao campo | `tests/components/premium-interactions.test.tsx` e navegador |
| Scrollbar | `app/globals.css` | Tokens `--ds-scroll-*`, documentados em DESIGN.md | vertical e horizontal; alto contraste do sistema | auditoria estática e estilos computados no navegador |

## Pesquisa

- Campos de CTB, POPs e Estrangeiros usam o mesmo botão “Limpar pesquisa” quando há texto.
- Limpar não envia o formulário: esvazia o campo, remove erro/resultado da consulta em curso e devolve o foco ao campo. O CTB mantém o modo Código/Artigo/Situação; Estrangeiros mantém os dados manuais da fiscalização.
- POPs e Estrangeiros cancelam a requisição em curso ao limpar. Uma resposta cancelada não pode reaparecer.
- Sugestões aguardam 300 ms; mudança de consulta ou limpeza cancela a solicitação anterior. Uma resposta antiga não substitui as sugestões atuais.

## Login

- O formulário controla a validação de preenchimento, sem balões nativos. Erros são associados aos campos; enviar dados incompletos foca o primeiro campo inválido e não chama a autenticação.
- Não normalizar ou registrar senhas. Elas permanecem mascaradas e podem ser coladas/preenchidas pelo gerenciador de senhas.
- Uma requisição de login por vez; falha preserva os campos e apresenta a mensagem para nova tentativa.
- Sucesso continua usando a sessão criada no servidor e navegação para `/admin`. A validação do cliente nunca concede acesso.

## Rolagem e teclado

- Novos contêineres roláveis herdam o tema global. Não esconder barras por estética; as setas das abas continuam disponíveis como alternativa.
- Rolagem central e preferência existente de leitura são preservadas. Alto contraste usa as cores e os controles do sistema.

## Artigos e resumo operacional

Referências identificadas como CTB abrem uma cópia do artigo em diálogo nativo, mantendo a consulta ao fundo. Escape e “Voltar à consulta” fecham o leitor e restauram o foco. A fonte oficial continua disponível, inclusive após falha de carregamento. A versão identifica o acervo e não certifica vigência.

As ferramentas da home usam links para suas rotas reais. Resultados de fiscalização mostram resumo e oferecem a ficha completa sob demanda; a seleção de uma alternativa atualiza ambos, sem decisão automática de enquadramento.
