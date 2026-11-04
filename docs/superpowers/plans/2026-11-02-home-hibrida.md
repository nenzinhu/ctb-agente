# Página inicial híbrida — plano de implementação

**Objetivo:** aplicar a direção híbrida escolhida pelo usuário: pixel editorial na página inicial e visual operacional nas consultas.

**Arquitetura:** manter Next.js, React e o formulário atual. Um módulo CSS exclusivo da inicial isola o fundo pontilhado, a composição editorial e os detalhes retrô. Adesivos SVG locais e originais representam um semáforo e um manual, sem JavaScript adicional.

## Restrições

- Preservar textos institucionais, busca, exemplos, histórico, destinos e fontes legais.
- Manter formulário e resultados legíveis, com os estados e o comportamento atuais.
- Fundo branco pontilhado no tema claro; adaptar ao escuro e remover decoração no modo sol e na impressão.
- Respeitar movimento reduzido, teclado e telas pequenas.

## Execução

- [x] Criar composição editorial da inicial, SVGs locais e módulo CSS isolado.
- [x] Manter painel de busca operacional e atalhos funcionais.
- [x] Executar typecheck e testes existentes de inicial, formulário, navegação e temas.
- [x] Conferir em navegador a 390px e 1440px, temas claro/escuro/sol, redução de movimento, navegação e envio da consulta.

## Pontos de revisão

Verificar overflow horizontal, adesivos sobre controles, contraste no tema escuro, remoção da decoração no modo sol e ausência de estilos editoriais na rota `/consulta`.

Mudança visual reversível: usar testes existentes e verificação real no navegador, sem testes que apenas reproduzam seletores ou a implementação do CSS.

## Verificação realizada

- TypeScript sem erros e 14 testes de componentes aprovados.
- 12 testes Playwright aprovados em desktop e celular: inicial, tela pequena, movimento reduzido, modo sol, envio e histórico de consultas.
- Inspeção visual em temas claro, escuro e sol; larguras 320, 360, 390, 768 e 1440px sem rolagem horizontal ou adesivos sobre o título.
- Modo sol sem fundo pontilhado nem adesivos. Rota `/consulta` sem elementos ou estilos editoriais. Nenhum erro JavaScript observado no navegador.

## Integração com a main remota

A revisão `64629eb` trouxe 22 commits posteriores à base local. A integração preserva o cabeçalho com submenus, a busca por código/artigo/palavra-chave, o histórico com proteção de dados e a apresentação compacta para celular. A decoração foi adaptada a essa estrutura.

- Suíte integrada: 154 suítes e 1.161 testes aprovados.
- Build de produção aprovado após a integração.
- Oito testes de navegador aprovados: hidratação, botão na primeira tela de 360px, consulta por artigo e manifesto PWA, em desktop e celular.
- Os testes antigos de descoberta dos módulos (320/360/390px), favoritos no tablet e precedência do tema esperam rótulos removidos na main: `Consultas rápidas`, link direto `Favoritos` e `Modo sol`. São dez falhas nas duas plataformas. Confirmado na cópia isolada da revisão remota, sem esta mudança: esses seletores não existem; o botão atual se chama `Modo pista`. Esses testes não foram alterados nesta integração.
- Conferidas larguras 320, 360, 390, 768 e 1440px sem rolagem horizontal.
