# Evolução operacional em três publicações

Pedido aprovado: executar as ideias 1–10 na ordem proposta e publicar main/produção após 1–3, 4–6 e 7–10.

- 1–3: abas de ferramentas abrem suas rotas diretamente; referências CTB abrem leitor interno acessível com fonte e retorno à consulta; resultado apresenta resumo operacional e detalhes completos sob demanda.
- 4–6: download explícito de acervo público para consulta offline com versão visível; retomada local de consultas e rascunhos de Pesos/Estrangeiros; comparação humana de até três fichas, sem conclusão automática.
- 7–10: distinguir transcrição, cadastro e explicação automática sem certificar vigência; comparar textualmente versões baixadas, preservando versão anterior; escolher três abas principais localmente; centralizar navegação e rótulos compartilhados.

## Decisões de implementação

Manter Next.js/React, PMRv, português BR, rolagem central e três abas visíveis. Usar o acervo já publicado, sem incorporar alterações jurídicas locais pendentes nem documentos privados do Supabase. Textos locais são cópias de consulta, com link oficial e aviso de conferência de vigência. Offline não executa IA e nunca apresenta uma atualização textual como revisão jurídica.

Leitor e comparação usam diálogo nativo acessível com Escape e restauração de foco. Pacotes offline e histórico ficam no aparelho; guardar duas versões de pacote em IndexedDB, sem cachear APIs administrativas/autenticadas. Rascunhos locais têm ação explícita para descartar e não armazenam resultados como se fossem atuais. Navegação direta preserva cabeçalho e barra; preferências são locais e recuperáveis.
