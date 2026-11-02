# Nemotron como modelo vetorial principal

Pedido: oferecer NVIDIA Nemotron 3.5 Embed 8B (free), via OpenRouter, como opção principal do RAG. Reutilizar `OPENROUTER_API_KEY`; não alterar modelos de geração de respostas.

Escolha técnica: manter Mistral como alternativa explícita e preservar seus vetores em `embedding`. Nemotron usa a coluna independente `embedding_nemotron`, com 1024 dimensões normalizadas (modelo com saída nativa de 4096 e redução suportada). Consultas e documentos usam o mesmo modelo, coluna e normalização; consultas usam input_type query e documentos passage. Falha de um modelo mantém busca textual, sem troca automática para um espaço vetorial diferente.

Adicionar seleção persistida e teste do modelo no painel RAG. Ordem padrão: Nemotron se OpenRouter configurado; Mistral legado quando só sua chave está presente; Nemotron aparece como principal mesmo antes de configurar chave. Preferência explícita ou `RAG_EMBEDDING_MODEL` prevalece sobre a detecção de chaves.

Migração 015 apenas acrescenta coluna, índices e RPCs Nemotron. Não apagar, converter nem sobrescrever vetores Mistral. Indexação, geração de pendentes, busca e diagnóstico usam o modelo escolhido. A migração e a geração dos vetores são etapas visíveis no painel; não executar reindexação em massa silenciosamente.

Checagem de ambiente: chave ausente neste executor; leitura das variáveis da Vercel retornou 403 de escopo, portanto presença em produção não confirmada. Não substituir nem criar chaves.

Referências: https://openrouter.ai/nvidia/nemotron-3.5-embed-8b:free e https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings .
