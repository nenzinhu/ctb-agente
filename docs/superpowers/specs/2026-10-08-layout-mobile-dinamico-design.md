# Layout mobile responsivo e dinâmico

## Objetivo

Otimizar todas as telas públicas do CTB Agente para uso operacional em celulares, priorizando consulta rápida com uma mão, leitura clara dos resultados e acesso consistente às ferramentas. O desktop deve permanecer estável. A Lista de Fatos PMSC já incorporada ao projeto continuará disponível no catálogo local e no RAG sem duplicação.

## Escopo

O novo padrão será aplicado às telas públicas de início, consulta CTB, enquadramento guiado, POPs, Lista de Fatos PMSC, professor, favoritos, apostila e ferramentas de PDF. O painel administrativo não faz parte desta etapa.

As alterações abrangem:

- cabeçalho compacto em telas pequenas;
- navegação inferior compartilhada;
- folhas inferiores para grupos de ações;
- espaçamento e hierarquia mobile-first;
- estados de carregamento e transições sutis;
- cartões e formulários responsivos;
- preservação do estado de consulta ao navegar.

## Estrutura mobile

O cabeçalho mantém marca, tema e instalação do PWA, mas ocupa menos altura no celular. A tela inicial apresenta a busca como ação principal, imediatamente visível, seguida de consultas recentes e acessos rápidos.

Uma barra fixa inferior aparece somente em telas pequenas e contém quatro destinos:

1. **Buscar** — abre a consulta principal;
2. **Ferramentas** — abre uma folha inferior com Enquadramento, POPs, Fatos PMSC, Professor, Apostila e PDFs;
3. **Favoritos** — abre os itens salvos;
4. **Mais** — abre uma folha inferior com início, consultas recentes, tema, instalação e informações.

A página reserva espaço para a barra, incluindo `env(safe-area-inset-bottom)`, para que nenhum botão, formulário ou resultado fique encoberto. O destino atual é indicado visualmente e por `aria-current`.

No desktop, a navegação existente continua visível e a barra inferior não é renderizada. O conteúdo mantém os limites de largura atuais, com ajustes apenas quando necessários para impedir saltos ou inconsistências entre breakpoints.

## Componentes e responsabilidades

### Navegação mobile

Um componente compartilhado controla os quatro destinos, a rota ativa e a abertura das folhas inferiores. Ele não replica regras de navegação dentro de cada página.

### Folha inferior

Um componente reutilizável oferece título, conteúdo, fechamento e gerenciamento de foco. Abre por toque, fecha por botão, toque externo ou tecla Escape e devolve o foco ao acionador. O gesto de arrastar é opcional e não será requisito para o primeiro lançamento.

### Busca principal

A busca inicial permanece curta e direta, com campo, voz e ação principal acessíveis. Código, artigo e situação podem aparecer como sugestões compactas, sem exigir que o usuário classifique manualmente a consulta.

### Cartões e resultados

Resultados usam cartões de largura total no celular. Conteúdo extenso de CTB e POP pode ser expandido e recolhido, mantendo sempre visíveis título, código, compatibilidade e fonte. Ações de salvar, copiar e compartilhar permanecem alcançáveis sem rolagem lateral.

## Interações e movimento

As transições terão duração entre 150 e 220 ms. Serão usadas apenas para comunicar abertura, fechamento, carregamento e entrada de resultados. Não haverá animações decorativas contínuas.

Durante consultas, esqueletos reservam o espaço do resultado para evitar mudança brusca do layout. Ao concluir, o primeiro resultado recebe foco programático quando isso ajuda a navegação por teclado ou leitor de tela, sem deslocar inesperadamente quem estiver digitando.

Salvar, copiar e compartilhar oferecem feedback textual imediato. Formulários preservam valores ao voltar de resultados ou ferramentas relacionadas. Estados offline, erro e ausência de resposta são mostrados no contexto da tela, sem bloquear a navegação.

Quando `prefers-reduced-motion: reduce` estiver ativo, transições e deslocamentos são removidos ou reduzidos ao mínimo funcional.

## Responsividade e acessibilidade

Os alvos de toque terão no mínimo 44 por 44 pixels. Contraste, foco visível, rótulos acessíveis, ordem de tabulação e regiões anunciadas serão preservados. A interface não dependerá apenas de cor ou movimento para indicar estado.

As larguras de referência são 320, 375, 390, 430 e 768 pixels, além do desktop. Em cada uma delas, a página deve permanecer sem rolagem horizontal, botões cortados, textos sobrepostos ou conteúdo escondido pela barra inferior.

Áreas laterais existentes passam para o fluxo vertical no celular. Tabelas e comparações que não couberem usarão contêiner explicitamente rolável com indicação acessível, sem fazer a página inteira transbordar.

## Lista de Fatos PMSC e RAG

O PDF anexado foi comparado com os artefatos existentes e produz exatamente os mesmos resultados:

- 23 páginas;
- 510 fatos;
- `data/acervo/fatos-pmsc-mobile.json` idêntico;
- `data/acervo/fatos-pmsc-mobile.txt` idêntico.

O arquivo não será importado novamente nem duplicado. O catálogo estruturado continua sendo o fallback local. O texto existente será mantido como fonte da coleção `natureza_potencial` no Supabase, permitindo busca por abreviações, gírias, erros e frases incompletas.

A implantação deve verificar se essa fonte está indexada e se seus vetores estão completos. A interface não afirmará que a indexação remota ocorreu apenas porque o arquivo está presente no repositório.

## Falhas e degradação

- Sem JavaScript, links essenciais continuam navegáveis sempre que possível.
- Se uma folha inferior falhar, os destinos permanecem disponíveis pelas rotas públicas.
- Sem animações, todo o fluxo continua funcional.
- Offline, o aplicativo mostra o estado disponível e não reutiliza respostas administrativas em cache.
- A barra inferior nunca deve impedir submissão, leitura ou recuperação de foco.
- A ausência do RAG remoto não impede a busca local dos 510 fatos.

## Verificação

Testes de componentes devem cobrir navegação ativa, abertura e fechamento das folhas, foco, Escape, clique externo, redução de movimento e espaço reservado pela barra inferior.

Os fluxos principais serão verificados nas larguras definidas, incluindo busca CTB, enquadramento, POP, fatos PMSC, favoritos e retorno entre telas. A verificação também confirma ausência de rolagem horizontal e preservação do conteúdo digitado.

Antes da conclusão serão executados:

- testes unitários e de componentes;
- testes E2E dos fluxos públicos principais;
- suíte completa;
- `npm run typecheck`;
- `npm run build`;
- validação dos 510 fatos locais;
- auditoria da coleção remota quando houver credencial Supabase disponível.
