---
name: CTB / MBFT — PMRv
description: Identidade visual de consulta CTB/MBFT e POPs em campo.
colors:
  primary: "#008448"
  primary-strong: "#01713d"
  plaque-ink: "#191b1e"
  plaque-gold: "#ffc900"
  plaque-edge: "#b88405"
  background: "#f4f5ea"
  surface: "#ffffff"
  text: "#1e293b"
  crest-red: "#e5252c"
  crest-orange: "#f7a616"
  crest-yellow: "#f6e10f"
  crest-green: "#1c8a3c"
typography:
  body:
    fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
  label:
    fontWeight: 800
    lineHeight: 1.15
rounded:
  control: "12px"
  card: "16px"
components:
  plaque:
    textColor: "{colors.plaque-ink}"
    padding: "10px 16px 9px"
    typography: "{typography.label}"
---

# Design System: CTB / MBFT — PMRv

## Overview

Referência visual aprovada: placas trapezoidais branco/prateado/amarelo, texto preto e brasão PMRv ao fundo. A consulta em português brasileiro mantém sua densidade e seus fluxos legais; a identidade vem do brasão existente em `public/brasao-cpmrv.png`.

## Colors

Verde institucional sustenta ações e cabeçalho; amarelo e dourado identificam as placas. Vermelho e laranja do brasão permanecem cores de identidade, sem substituir as cores semânticas de infração. Os valores acima descrevem o tema claro; `app/globals.css` é a fonte de verdade para a cascata dos temas.

No escuro, fundo verde profundo (`--ds-bg: #111b15`), superfície (`--ds-surface: #1b2820`) e texto claro (`--ds-text: #f5f4e9`) preservam a leitura. O modo sol usa seus tokens específicos de contraste e reduz a marca-d’água a 0,035; as placas mantêm texto escuro e seu degradê. Não presumir fundo ou cabeçalho monocromáticos: os overrides PMRv também participam da cascata.

## Typography

Fonte nativa sem downloads; monoespaçada existente para códigos e metadados. As placas usam texto real em peso forte, sem SVG ou imagem de texto. Rótulos mobile adaptam-se com `clamp(10px, 2.8vw, 12px)`.

## Layout

SPA com altura de tela e conteúdo central paginado; o modo de leitura contínua permite rolagem central. A navegação inferior permanece visível no mobile, respeitando a área segura. Na home, a área central limita-se a 760px e sete abas ficam em uma faixa horizontal com setas de avanço e retorno, com três visíveis no celular (390px) e quatro no desktop. Preservar rotas, atalhos e funções existentes.

## Elevation & Depth

Superfícies leves e semitransparentes deixam o brasão aparecer. A marca-d’água central usa opacidade 0,18 no claro/escuro; impressão a oculta. O relevo das placas vem do degradê e do filete dourado, com realce branco interno.

## Shapes

Abas com topo estreito, laterais inclinadas e base larga: recorte `polygon(12% 0, 88% 0, 100% 100%, 0 100%)`. Controles e painéis conservam seus cantos arredondados; não transformar toda a interface em placas.

## Components

Abas de navegação e da home compartilham a placa CSS. A faixa inclui Estrangeiros, Pesos e Fatos comunicantes; as setas movem somente a faixa e a aba ativa fica visível ao navegar por teclado ou trocar de página. Seleção: sublinhado, elevação de 3px e base mais espessa; hover: elevação de 2px. Foco visível usa contorno de 3px. Ferramentas usam placas maiores com borda inferior dourada. Botões, campos, cartões e indicadores legais preservam os componentes e estados existentes. Movimento reduzido desativa as transições das abas.

## Do's and Don'ts

- **Do** reutilizar o brasão fornecido e as placas CSS com rótulos legíveis.
- **Do** verificar desktop, mobile, teclado e temas claro, escuro e sol.
- **Don't** adicionar SVG às abas ou converter seus rótulos em imagens.
- **Don't** alterar rotas, conteúdo legal ou comportamento de leitura para aplicar a identidade.
