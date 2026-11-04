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

### Acervo local e retomada
- `/offline` exige download explícito do pacote público incluído no app. Versão, contagens e data ficam visíveis; uploads administrativos não entram automaticamente. IndexedDB preserva a versão anterior em atualizações e mantém o pacote em falha de download/gravação.
- Consulta local não envia perguntas nem gera respostas por IA. Vigência deve ser conferida na fonte oficial.
- Rascunhos de CTB, POP, estrangeiros e pesos restauram somente campos conhecidos, com aviso local e opção de descarte; nunca retomam resultados nem enviam uma consulta automaticamente. Identificadores reconhecidos são mascarados; não inserir dados pessoais.
- Histórico contém apenas códigos/artigos. Comparação mantém no máximo três fichas do acervo em memória, com remoção e limpeza, sem recomendação automática de enquadramento.

### Origem, versões e preferências
- Rótulos diferenciam documento, cadastro, IA e revisão pendente. Uma citação localizada na base não comprova vigência nem revisão jurídica.
- `/atualizacoes` compara conteúdo das versões atual e anterior no aparelho: artigos, fichas e POPs. Ignora alterações apenas de página/versão. Sem duas versões, explica a condição; não inventa histórico.
- Ferramentas permite escolher três abas distintas, conhecidas, salvas localmente. Restaurar padrão e falha de armazenamento têm feedback. Navegação de home/mobile/desktop compartilha rotas, ordem, rótulos curtos e indicação do destino ativo; demais destinos permanecem disponíveis.

Verificação final do roadmap: 1.224 testes Jest, typecheck, build webpack de produção e 12 cenários E2E de viewport/leitura aprovados. Conferência adicional em 390 px e 1440 px verificou abas persistentes, foco de retorno do leitor e comparação local de versões. Regressões cobrem citações quebradas dentro de 147-A, referências com sufixo espaçado, rascunhos de tipos incorretos, pacotes corrompidos e tipificação integral offline.
