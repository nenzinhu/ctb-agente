# Task 6: Admin Panel

**Objetivo:** Criar interface privada para admin (nenzinhu) gerenciar documentos e configurações

## Arquivos a Criar

- `app/admin/page.tsx` — Dashboard admin
- `app/admin/login/page.tsx` — Página de login
- `lib/auth/admin.ts` — Verificação de credenciais (hardcoded: nenzinhu/bcrypt)
- `components/AdminUploadForm.tsx` — Form de upload de documentos
- `components/DocumentList.tsx` — Listagem de documentos (dispositivos)
- `lib/auth/session.ts` — Session management (cookie baseado)
- `middleware.ts` — Proteção de rotas `/admin`

## Funcionalidades

1. **Login:**
   - Usuário: `nenzinhu` (hardcoded)
   - Senha: hash bcrypt em `.env.local` (ADMIN_PASSWORD_HASH)
   - Session cookie (httpOnly, 24h expiry)
   - Fallback: se sem hash, login com qualquer senha (dev mode)

2. **Dashboard:**
   - Resumo de documentos (total, tipos, datas)
   - Upload de arquivo novo
   - Listagem de documentos com busca
   - Actions: visualizar, editar metadata, deletar

3. **Upload UI:**
   - Drag & drop ou file input
   - Validação antes de enviar
   - Progress bar
   - Mensagens de sucesso/erro
   - Chama `/api/ingestion/upload` (Task 5)

4. **Documentos:**
   - Tabela com colunas: nome, tipo, data pub, vigência
   - Ordenar por: nome, data, tipo
   - Filtrar por tipo
   - Paginação (20 por página)

## Dependências

- Task 5 deve estar completa (`/api/ingestion/upload`)
- Existentes: Supabase client, Zod

## Testes

- Login: credencial certa funciona, errada rejeita
- Session: cookie persiste, expira após 24h
- Upload: chamada ao endpoint correto
- Listagem: busca e filtro funcionam

## Commit

```
feat: implement admin panel for document management

- Add admin login page with session management
- Create admin dashboard with document overview
- Add upload form with file validation
- Implement document list with search/filter
- Add middleware for route protection
- Include tests for auth and CRUD
```

**Nota:** Endpoints `/admin*` requerem autenticação. Público acesso apenas `/api/consulta` e `/`.
