# Seletores operacionais responsivos

## Intenção

Impedir que listas de POPs e configurações de caminhões ultrapassem a tela e tornar desenhos, nomes e especificações legíveis sob uso operacional em desktop e celular.

## Abordagem

- Substituir o `select` nativo do manual de POPs por um combobox próprio, pesquisável, com lista limitada ao contêiner, altura máxima e rolagem.
- Manter o seletor visual de caminhões, mas reorganizar cada opção como card responsivo: desenho acima no celular e ao lado no desktop.
- Exibir nomes visualmente em maiúsculas, transformar código/eixos/unidades/PBT em etiquetas e ampliar SVG, eixos e legendas.
- Preservar conteúdo do catálogo, teclado, leitor de tela, contraste e preferência de movimento reduzido.

## Alternativas consideradas

- Encurtar opções nativas: evita parte do estouro, mas esconde o nome necessário para escolher o POP.
- Manter os cards atuais apenas aumentando o SVG: não resolve hierarquia, quebra de texto nem adaptação móvel.

## Critérios

- Nenhum menu pode aumentar a largura do documento.
- POPs devem ser filtráveis por número ou nome e selecionáveis por teclado.
- Cards de caminhões devem empilhar em telas pequenas e usar duas áreas no desktop.
- Nomes principais devem aparecer em maiúsculas sem alterar os dados originais.
- Eixos E1…En e grupos G1…Gn devem ser legíveis nos desenhos compactos.
