# Risco residual de dependências

Em 2026-10-08, `npm audit --omit=dev --audit-level=high` não encontrou
vulnerabilidades altas ou críticas depois da migração para Next.js 16 e
Serwist 9.

Permanecem três avisos moderados na cadeia `mammoth → argparse → sprintf-js`.
O npm sugere instalar `mammoth@0.3.29`, um downgrade incompatível e muito
antigo, portanto essa correção automática não foi aplicada. A exposição é
limitada porque arquivos DOCX só são enviados por uma sessão administrativa,
possuem limite de tamanho e são processados no servidor. A cadeia deve ser
substituída quando houver uma versão corrigida compatível; até lá, uploads de
origem não confiável não devem ser aceitos.
