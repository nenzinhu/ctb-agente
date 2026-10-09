# Lista de Fatos (PMSC Mobile) — desenho

## Objetivo

Criar uma aba pública chamada **LISTA DE FATOS (PMSC MOBILE)** para consultar a lista de fatos constatados da PMSC a partir de descrições livres. A busca deve compreender abreviações, gírias, erros de digitação, palavras incompletas e frases, sem criar ou alterar os registros oficiais do documento.

## Fonte e autoridade

O PDF “LISTA DE FATOS CONSTATADOS - PMSC MOBILE”, atualizado em 10/06/2019, será preservado no acervo do projeto. Cada linha será extraída como um registro estruturado com:

- grupo;
- natureza;
- potencial ofensivo;
- página;
- versão da fonte.

O catálogo estruturado será a autoridade para os campos exibidos. A busca semântica poderá localizar um registro, mas nunca produzir uma natureza, grupo ou potencial ofensivo que não exista no catálogo.

## Arquitetura de busca

Um importador determinístico converterá a tabela do PDF em JSON versionado no projeto. O catálogo local será pesquisado primeiro, garantindo funcionamento sem banco ou IA.

A recuperação combinará:

1. correspondência exata e por expressão;
2. índice lexical tolerante a palavras incompletas e erros de digitação;
3. vocabulário controlado de abreviações, gírias e sinônimos;
4. busca semântica na coleção Supabase `natureza_potencial`, quando disponível.

Os resultados das fontes serão consolidados contra o catálogo local. Serão retornadas no máximo três alternativas reais, ordenadas por compatibilidade. Nenhuma será selecionada automaticamente. Se nenhuma atingir a cobertura mínima, a API retornará uma resposta sem sugestões.

## Ingestão e RAG

O conteúdo estruturado também será preparado para indexação no Supabase com a coleção `natureza_potencial`. Cada trecho manterá juntos grupo, natureza e potencial ofensivo para impedir associações incorretas entre linhas da tabela.

Falhas de Supabase, embeddings ou modelos não impedirão a consulta local. O RAG é um complemento de recuperação, não a autoridade da resposta.

## Interface

A nova aba terá:

- título **LISTA DE FATOS (PMSC MOBILE)**;
- campo para texto ou ditado por voz;
- exemplos de consultas em linguagem operacional;
- até três cartões de alternativas;
- grupo, natureza, potencial ofensivo, página e indicação de compatibilidade em cada cartão;
- aviso para conferência humana quando houver mais de uma alternativa;
- estado explícito quando não houver correspondência segura;
- rodapé discreto “Lista atualizada em 10/06/2019”.

O texto da interface não declarará nenhuma alternativa como decisão definitiva.

## Privacidade, cache e falhas

Dados pessoais serão filtrados antes da recuperação e não serão persistidos. A API será dinâmica, responderá com `no-store` e permanecerá fora do cache do service worker.

Erros de entrada receberão resposta de validação. Indisponibilidade do RAG acionará silenciosamente o catálogo local. Uma falha total produzirá mensagem clara, sem sugestão inventada.

## Validação

Os testes cobrirão:

- extração correta das três colunas e da página;
- consultas por abreviação, gíria, erro, fragmento e frase;
- limite de três alternativas e ausência de seleção automática;
- ausência de campos inventados;
- fallback local sem banco, embeddings ou IA;
- filtragem de dados pessoais e política `no-store`;
- navegação e interação da nova aba;
- verificação de tipos, suíte completa e build de produção.

