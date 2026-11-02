# Interface operacional do CTB Agente

## Intenção e escopo aprovado
O usuário pediu um webapp PWA e escolheu combinar o refinamento da interface existente com a reorganização da página inicial (resposta `1+2`). Priorizar a consulta em campo, preservando módulos, dados oficiais, busca existente, instalação, preferências de tema e modo sol.

## Abordagens
1. Refinar apenas os componentes existentes: menor mudança na disposição da página.
2. Reorganizar também a página inicial: busca centralizada acima das orientações e ferramentas.
Escolha do usuário: combinar ambas. Manter Next.js, React e os tokens CSS existentes, sem dependências adicionais.

## Desenho
- Navegação principal visível também no celular, com pills horizontais, ícones, estado ativo e alvos de pelo menos 44 px. Manter os sete módulos pedidos na sequência e os recursos adicionais disponíveis.
- Introdução compacta e consulta centralizada em destaque; orientações e ferramentas ficam abaixo, sem coluna lateral competindo com a busca.
- Atalhos Código, Artigo e Palavra-chave orientam o campo sem apagar o texto. No modo Artigo, um número isolado é enviado como `art. N`; outras consultas continuam sendo interpretadas pelo mecanismo existente. Não prometer uma restrição de resultados que a API não implementa.
- Tema escuro com superfícies azul-marinho, destaque azul nas referências e verde nas ações. Preservar preferência do sistema e modo sol de alto contraste.
- Cards de fiscalização com cabeçalho limpo, conduta em destaque e resumo de enquadramento, pontuação e penalidade, usando as mesmas fontes e precedência já existentes. Dados ausentes continuam indicados como ausentes.

## Limites e verificação
Sem mudanças em APIs, corpus, regras jurídicas ou política de cache do PWA. Verificar consultas por artigo, preservação do texto entre atalhos, rotas principais no celular, temas persistentes, ausência de overflow, build e testes existentes. Validar a UI no navegador em desktop e celular.
