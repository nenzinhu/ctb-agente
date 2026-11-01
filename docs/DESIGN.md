# Padrão visual — Manual de campo

O CTB Agente usa uma linguagem visual própria, inspirada em sinalização rodoviária,
cadernos de levantamento e manuais impressos de operação. A interface deve parecer
uma ferramenta de campo: direta, resistente à leitura sob luz forte e sempre
subordinada à fonte oficial.

## Princípios

1. **Fonte primeiro.** A resposta jurídica e sua origem têm precedência sobre qualquer efeito visual.
2. **Ação antes de explicação.** Títulos e mensagens começam pelo que a pessoa precisa fazer.
3. **Sinalização, não decoração.** O amarelo marca atenção, foco e ações; nunca vira texto pequeno sobre papel claro.
4. **Densidade controlada.** Cartões separam tarefas, mas não escondem a próxima ação em camadas decorativas.
5. **Cautela explícita.** Compatibilidade não é conclusão jurídica; IA não substitui MBFT, CTB ou POP.

## Tipografia

| Papel | Família | Uso |
|---|---|---|
| Títulos e ações | Barlow Condensed 600/700 | H1, títulos de seção, botões e navegação |
| Leitura | Atkinson Hyperlegible Next | Corpo, formulários, fichas e textos longos |
| Referência | IBM Plex Mono 400/600 | Códigos, artigos, etapas, rótulos e contadores |

As fontes são empacotadas com o aplicativo e não dependem de download em tempo de
execução. Títulos usam caixa alta com intenção editorial; corpo e mensagens mantêm
caixa de frase para leitura contínua.

## Cores e contraste

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--ds-bg` | `#f4f1e8` | `#101813` | Papel quente / campo noturno |
| `--ds-surface` | `#fffefa` | `#17231c` | Cartões e controles |
| `--ds-text` | `#17241d` | `#f6f2e7` | Texto principal |
| `--ds-subtle` | `#506057` | `#c6d0c8` | Texto secundário |
| `--ds-primary` | `#0b5238` | `#80d6a7` | Identidade e ação |
| `--ds-accent` | `#f3b544` | `#f3b544` | Marcação, foco e destaque |
| `--ds-ink` | `#174f78` | `#8ec8f0` | Links |
| `--ds-danger` | `#a52820` | `#ff9e95` | Erro e gravidade máxima |

Contrastes mínimos verificados no tema claro:

- texto principal sobre superfície: **15,9:1**;
- texto secundário sobre superfície: **6,6:1**;
- texto branco sobre verde de ação: **9,2:1**;
- texto escuro sobre amarelo: **8,8:1**;
- foco laranja sobre papel: **5,1:1**.

O “modo sol” usa preto sobre branco puro e remove textura, sombras e transparências.
Nunca use `--ds-accent` como cor de texto pequeno sobre superfície clara.

## Forma e composição

- Cantos: 8 px para controles, 12 px para cartões e 4 px para selos.
- Cartões usam borda fina e sombra física curta, não vidro ou flutuação.
- O título de seção recebe uma régua com marca amarela de 40 px.
- Ícones de seção e de página ocupam um quadrado amarelo com borda escura.
- O fundo usa uma grade discreta de 48 px, limitada por máscara vertical.
- O cabeçalho é verde profundo, com uma régua amarela de 3 px.
- Layouts móveis preservam alvos de toque de pelo menos 44 px.

## Movimento

- Uma entrada curta em resultados e no painel móvel é suficiente.
- Transições não podem atrasar leitura ou deslocar o layout.
- `prefers-reduced-motion: reduce` reduz animações, transições e rolagem suave.
- Mudanças de tema devem ocorrer antes da primeira pintura quando persistidas.

## Microcopia

- Escreva instruções de campo: “Informe o peso”, não “O sistema realizará a análise”.
- Use `Ex.:`, reticências `…`, plurais reais e sentence case em rótulos comuns.
- Erros seguem **problema + recuperação**: “Não foi possível salvar. Tente novamente.”
- Traduza termos internos: “verificação de segurança”, não “anti-bot”; “dados de exemplo”, não “seed”.
- Preserve avisos de fonte vigente, revisão humana, limitação da IA e ausência de fonte.

## Acessibilidade

- A suíte `tests/e2e/accessibility.test.ts` verifica WCAG 2.1/2.2 AA com Axe nos temas claro, escuro e sol.
- Toda ação deve ter nome acessível que contenha o texto visível.
- Abas seguem o padrão ARIA completo, com setas, Home/End, `aria-controls` e painel associado.
- Foco visível usa 3 px e nunca é removido sem substituto de contraste equivalente.
- Gráficos e mensagens de status devem ter alternativa textual; ícones decorativos usam `aria-hidden`.
