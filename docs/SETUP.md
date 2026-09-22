# CTB Agente — Setup Guia

## 1. Supabase Project

1. Create project at supabase.com
2. Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
3. Get `SUPABASE_SERVICE_ROLE_KEY` from Settings > API > Service Role Key
4. Copy to `.env.local`

## 2. Run migrations

1. Go to Supabase dashboard > SQL Editor
2. Paste the entire contents of `scripts/migrations.sql`
3. Click "Run"
4. Verify tables exist: `dispositivos`, `enquadramentos`, etc.

## 3. Initialize .env.local

```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your credentials
```

## 4. Install dependencies and run dev server

```bash
npm install
npm run dev
# Open http://localhost:3000
```
