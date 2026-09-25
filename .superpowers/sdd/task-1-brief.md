# Task 1: Initialize Next.js project and configure PWA

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local.example`
- Create: `public/manifest.json`, `public/icons/`
- Create: `app/layout.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: Working dev server (`npm run dev`), PWA manifest with offline capability, TypeScript strict mode enabled.

## Steps

- [ ] **Step 1: Create Next.js 15 project with TypeScript**

```bash
cd /c/CTB-AGENTE
npm create next-app@latest . --typescript --tailwind --no-git --no-eslint --import-alias '@/*'
```

- [ ] **Step 2: Update `package.json` with additional dependencies**

Add:
```json
{
  "dependencies": {
    "next": "^15.5.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@supabase/supabase-js": "^2.45.0",
    "zod": "^4.6.5",
    "@react-pdf/renderer": "^3.14.0",
    "pdfjs-dist": "^3.14.0",
    "mammoth": "^1.8.0",
    "next-pwa": "^5.6.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.1.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.40",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

Run: `npm install`

- [ ] **Step 3: Create `next.config.ts` with PWA plugin**

```typescript
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

- [ ] **Step 4: Create `.env.local.example`**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin credentials (set on first run)
ADMIN_USERNAME=nenzinhu
ADMIN_PASSWORD_HASH=bcrypt-hash-here

# LLM Providers
GROQ_API_KEY=your-key
NVIDIA_API_KEY=your-key
OPENROUTER_API_KEY=your-key
MISTRAL_API_KEY=your-key

# Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# App
NEXT_PUBLIC_APP_NAME=CTB Agente
RATE_LIMIT_QUERIES_PER_HOUR=30
```

Copy to `.env.local` and fill in your keys.

- [ ] **Step 5: Create `public/manifest.json`**

```json
{
  "name": "CTB Agente",
  "short_name": "CTB",
  "description": "Consulta legislação de trânsito com precisão cirúrgica",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a5f3f",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 6: Create `app/layout.tsx` with PWA meta tags**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CTB Agente',
  description: 'Consulta legislação de trânsito brasileira com IA',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#1a5f3f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CTB Agente" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
.next/
.env.local
.env.local.backup
dist/
out/
*.log
.DS_Store
.idea/
*.swp
.vscode/settings.json
```

- [ ] **Step 8: Create `jest.config.ts` (for test runner)**

```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/app', '<rootDir>/lib'],
};

export default createJestConfig(config);
```

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.ts .env.local.example public/ app/ .gitignore jest.config.ts
git commit -m "chore: initialize Next.js 15 project with PWA configuration

- Add Next.js, React 19, TailwindCSS, Supabase dependencies
- Enable PWA with next-pwa
- Configure TypeScript strict mode
- Create manifest.json for install prompts
- Add .env.local.example template
- Setup root layout with meta tags for mobile
- Add Jest for testing infrastructure

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Verify dev server runs: `npm run dev` (should start on http://localhost:3000)
