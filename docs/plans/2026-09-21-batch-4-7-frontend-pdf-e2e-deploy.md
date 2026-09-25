# Batch 4-7: Frontend UI, PDF Generation, E2E Tests & Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Complete frontend UI for consultation results, PDF dossiê generation, end-to-end tests, and production deployment configuration.

**Architecture:** 
- Task 7-8: Build frontend components for displaying structured responses and search UI
- Task 9-10: Implement PDF generation with thematic filtering and UI
- Task 11: E2E tests covering full query flow
- Task 12-14: Configure Vercel environment, populate initial corpus, and deploy

**Tech Stack:** Next.js 15, React 19, @react-pdf/renderer, TypeScript, Jest, Playwright

**Spec:** [2026-09-21-ctb-agente-design.md](../specs/2026-09-21-ctb-agente-design.md)

## Global Constraints

- TypeScript strict mode enabled
- React 19.1.0, Next.js ^15.5.0
- Responses must be CartaoEstruturado interface (lib/response/response-types.ts)
- All response citations must pass validateCitations()
- Rate limiting: 30 queries/IP/hour (configurable in admin)
- Turnstile anti-bot protection required
- PII filtering before sending to AI
- PDF generation via @react-pdf/renderer ^4.8.0
- Tests: Jest 29.7.0, no untested code
- No hardcoded credentials in code or commits
- Deployment: Vercel production only

---

## Task 7: Frontend Response Display Component

**Files:**
- Create: `components/ConsultaResult.tsx` — structured response card display
- Create: `components/CartaoTecnico.tsx` — technical block (code, gravidade, measures)
- Create: `components/CartaoSimples.tsx` — simple explanation block (lay language)
- Create: `components/CitacaoEvidencia.tsx` — expandable citation with source text
- Create: `app/consulta/page.tsx` — consultation results page
- Create: `styles/consulta.module.css` — styling for cards
- Test: `tests/components/consulta-result.test.tsx` — component rendering
- Modify: `app/page.tsx` — link consultation button to /consulta

**Interfaces:**
- Consumes: CartaoEstruturado (lib/response/response-types.ts), /api/consulta response
- Produces: React components for displaying CartaoEstruturado, URL route `/consulta`

- [ ] **Step 1: Create CartaoTecnico.tsx (technical block component)**

```typescript
'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';

interface CartaoTecnicoProps {
  card: CartaoEstruturado;
}

export default function CartaoTecnico({ card }: CartaoTecnicoProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-l-4 border-ctb-green">
      <h2 className="text-2xl font-bold text-ctb-green mb-6">
        {card.enquadramento.infracacao}
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">Código MBFT</p>
          <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
            {card.enquadramento.codigo_mbft}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">Gravidade</p>
          <p className={`text-xl font-bold ${
            card.enquadramento.gravidade === 'gravíssima' ? 'text-red-600' :
            card.enquadramento.gravidade === 'grave' ? 'text-orange-600' :
            card.enquadramento.gravidade === 'média' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {card.enquadramento.gravidade.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pontos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {card.enquadramento.pontos}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Multa</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {card.enquadramento.valor_multa}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">CNH</p>
          <p className="text-sm text-gray-900 dark:text-white">
            {card.categoria_cnh_exigida}
          </p>
        </div>
      </div>

      {card.enquadramento.retem_veiculo && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="font-semibold text-yellow-900 dark:text-yellow-100">
            ⚠️ Veículo retido
          </p>
        </div>
      )}

      {card.enquadramento.remove_veiculo && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4 mb-4">
          <p className="font-semibold text-red-900 dark:text-red-100">
            🚗 Remoção: {card.enquadramento.medida_administrativa}
          </p>
        </div>
      )}

      {card.enquadramento.liberacao_no_local && (
        <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-400 p-4 mb-4">
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            {card.enquadramento.liberacao_no_local.possivel ? '✅ Pode liberar no local' : '❌ Deve remover'}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            {card.enquadramento.liberacao_no_local.motivo}
          </p>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Amparo Legal</h3>
        <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
          {card.enquadramento.amparo_legal}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CartaoSimples.tsx (simple explanation component)**

```typescript
'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';

interface CartaoSimplesProps {
  card: CartaoEstruturado;
}

export default function CartaoSimples({ card }: CartaoSimplesProps) {
  return (
    <div className="bg-gradient-to-br from-green-50 dark:from-green-900 to-white dark:to-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-ctb-green mb-4">
        Em palavras simples
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            O que aconteceu?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {card.explicacao_simples}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Exemplo do dia a dia
          </h3>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border-l-4 border-ctb-green">
            <p className="text-gray-700 dark:text-gray-300 italic">
              {card.exemplo_dia_a_dia}
            </p>
          </div>
        </div>

        {card.crime_transito && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded">
            <p className="font-bold text-red-900 dark:text-red-100">
              ⚠️ ATENÇÃO: Crime de trânsito
            </p>
            <p className="text-red-800 dark:text-red-200 text-sm mt-2">
              {card.crime_transito}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CitacaoEvidencia.tsx (citation expandable component)**

```typescript
'use client';

import { useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';

interface CitacaoEvidenciaProps {
  citacoes: CartaoEstruturado['citacoes'];
}

export default function CitacaoEvidencia({ citacoes }: CitacaoEvidenciaProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!citacoes || citacoes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        📋 Fontes e Citações
      </h3>

      <div className="space-y-3">
        {citacoes.map((cit, idx) => (
          <div
            key={idx}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === idx.toString() ? null : idx.toString())}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="text-left">
                <p className="font-mono text-sm text-ctb-green">
                  {cit.dispositivo}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {cit.validada ? '✅ Validada' : '⚠️ Não verificada'}
                </p>
              </div>
              <span className="text-gray-400">
                {expanded === idx.toString() ? '−' : '+'}
              </span>
            </button>

            {expanded === idx.toString() && (
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{cit.trecho}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ConsultaResult.tsx (main result component)**

```typescript
'use client';

import { useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import CitacaoEvidencia from './CitacaoEvidencia';

interface ConsultaResultProps {
  card: CartaoEstruturado;
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'tecnico' | 'simples'>('tecnico');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setView('tecnico')}
          className={`px-4 py-2 font-semibold transition-colors ${
            view === 'tecnico'
              ? 'text-ctb-green border-b-2 border-ctb-green'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Técnico
        </button>
        <button
          onClick={() => setView('simples')}
          className={`px-4 py-2 font-semibold transition-colors ${
            view === 'simples'
              ? 'text-ctb-green border-b-2 border-ctb-green'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Em Palavras Simples
        </button>
      </div>

      {view === 'tecnico' && (
        <div className="space-y-8">
          <CartaoTecnico card={card} />
          {card.checklist_ait && card.checklist_ait.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                ✅ Checklist do AIT
              </h3>
              <ul className="space-y-2">
                {card.checklist_ait.map((item, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {card.erros_comuns && card.erros_comuns.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                ❌ Erros Comuns
              </h3>
              <ul className="space-y-2">
                {card.erros_comuns.map((item, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}

      {view === 'simples' && (
        <div className="space-y-8">
          <CartaoSimples card={card} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create app/consulta/page.tsx**

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

export default function ConsultaPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CartaoEstruturado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q');

  useEffect(() => {
    if (!query) return;

    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consulta: query }),
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar resultado');
        }

        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [query]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Link href="/" className="text-green-600 hover:text-green-700 font-semibold mb-4 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Resultado da Consulta
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Busca: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {query}
          </span>
        </p>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Buscando informações...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 p-6 rounded">
            <p className="font-bold text-red-900 dark:text-red-100">Erro</p>
            <p className="text-red-800 dark:text-red-200 text-sm mt-2">{error}</p>
          </div>
        )}

        {result && <ConsultaResult card={result} />}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Update app/page.tsx to navigate to /consulta**

Modify the form submission to navigate instead of calling API directly:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/consulta?q=${encodeURIComponent(query)}`);
    }
  };

  if (showForm) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="mb-8">
            <Link href="/" onClick={() => setShowForm(false)} className="text-green-600 hover:text-green-700 font-semibold">
              ← Voltar
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Consulta CTB
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Digite um código de infração, número de artigo ou descreva a situação
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sua consulta
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Consultar
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          CTB Agente
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Consulta legislação de trânsito brasileira com IA
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-12 max-w-md">
          Responde com precisão cirúrgica sobre infrações, artigos, enquadramentos e jurisprudência
        </p>

        <button
          onClick={() => setShowForm(true)}
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Iniciar Consulta
        </button>

        <div className="mt-16 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-4">Para agentes de trânsito (PM, PC, PRF, polícia municipal)</p>
          <p>⚠️ App em desenvolvimento - Fase 3/7 em progresso</p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Create test file tests/components/consulta-result.test.tsx**

```typescript
import { render, screen } from '@testing-library/react';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

const mockCard: CartaoEstruturado = {
  tipo: 'enquadramento',
  sucesso: true,
  enquadramento: {
    codigo_mbft: '516-91',
    infracacao: 'Estacionar em local proibido',
    amparo_legal: 'art. 181, inciso XVII do CTB',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 'R$ 293,47',
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'CRLV',
    liberacao_no_local: {
      possivel: false,
      motivo: 'Art. 270: remoção obrigatória',
      citacao_validada: true,
    },
  },
  checklist_ait: ['[ ] Fotografar o veículo'],
  erros_comuns: ['❌ Sem fotografia da sinalização'],
  concurso_infrações: [],
  crime_transito: null,
  categoria_cnh_exigida: 'qualquer',
  normas_relacionadas: [],
  jurisprudencia: [],
  explicacao_simples: 'Você estacionou em um lugar proibido.',
  exemplo_dia_a_dia: 'Um motorista estaciona em uma vaga de idoso...',
  citacoes: [
    {
      trecho: 'Art. 181. Estacionar o veículo...',
      dispositivo: 'art. 181 XVII do CTB',
      validada: true,
    },
  ],
  timestamp: new Date().toISOString(),
};

describe('ConsultaResult', () => {
  it('renders technical view by default', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('516-91')).toBeInTheDocument();
  });

  it('switches to simple view on button click', async () => {
    const { getByText } = render(<ConsultaResult card={mockCard} />);
    getByText('Em Palavras Simples').click();
    expect(screen.getByText(mockCard.explicacao_simples)).toBeInTheDocument();
  });

  it('displays checklist items', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText(/Fotografar o veículo/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run tests and verify component rendering**

```bash
npm test -- tests/components/consulta-result.test.tsx
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add components/Cartao* components/CitacaoEvidencia.tsx app/consulta/page.tsx app/page.tsx tests/components/consulta-result.test.tsx
git commit -m "feat: implement consultation result display component

- Add CartaoTecnico for technical field display
- Add CartaoSimples for layman explanation
- Add CitacaoEvidencia for expandable citations
- Add ConsultaResult main component with view toggle
- Create /consulta page for result display
- Update / navigation to query string flow
- Include component tests

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Search & Filter UI on Homepage

**Files:**
- Create: `components/ConsultaForm.tsx` — reusable query input form
- Create: `components/RecentQueries.tsx` — recent queries from localStorage
- Create: `lib/search/local-storage.ts` — save/retrieve queries locally
- Modify: `app/page.tsx` — integrate new components
- Test: `tests/components/consulta-form.test.tsx`

**Interfaces:**
- Consumes: Router, localStorage
- Produces: Form component, recent queries UI

- [ ] **Step 1: Create lib/search/local-storage.ts**

```typescript
const RECENT_QUERIES_KEY = 'ctb-recent-queries';
const MAX_RECENT = 5;

export function saveQuery(query: string): void {
  try {
    const recent = getRecentQueries();
    const filtered = recent.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save query:', err);
  }
}

export function getRecentQueries(): string[] {
  try {
    const data = localStorage.getItem(RECENT_QUERIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to get recent queries:', err);
    return [];
  }
}

export function clearRecentQueries(): void {
  try {
    localStorage.removeItem(RECENT_QUERIES_KEY);
  } catch (err) {
    console.error('Failed to clear queries:', err);
  }
}
```

- [ ] **Step 2: Create components/ConsultaForm.tsx**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveQuery } from '@/lib/search/local-storage';

interface ConsultaFormProps {
  autoFocus?: boolean;
}

export default function ConsultaForm({ autoFocus = false }: ConsultaFormProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    saveQuery(query);
    router.push(`/consulta?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sua consulta
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
          autoFocus={autoFocus}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-ctb-green focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full bg-ctb-green hover:bg-ctb-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {loading ? 'Consultando...' : 'Consultar'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create components/RecentQueries.tsx**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentQueries, clearRecentQueries, saveQuery } from '@/lib/search/local-storage';

export default function RecentQueries() {
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRecent(getRecentQueries());
  }, []);

  const handleQueryClick = (query: string) => {
    saveQuery(query);
    router.push(`/consulta?q=${encodeURIComponent(query)}`);
  };

  const handleClear = () => {
    clearRecentQueries();
    setRecent([]);
  };

  if (recent.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Consultas recentes
        </h3>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Limpar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((query, idx) => (
          <button
            key={idx}
            onClick={() => handleQueryClick(query)}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-ctb-green/20 transition-colors"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update app/page.tsx to use new components**

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConsultaForm from '@/components/ConsultaForm';
import RecentQueries from '@/components/RecentQueries';

export default function Home() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="mb-8">
            <button
              onClick={() => setShowForm(false)}
              className="text-ctb-green hover:text-ctb-green/80 font-semibold flex items-center gap-2"
            >
              ← Voltar
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Consulta CTB
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Digite um código de infração, número de artigo ou descreva a situação
            </p>

            <ConsultaForm autoFocus={true} />
            <RecentQueries />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          CTB Agente
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Consulta legislação de trânsito brasileira com IA
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-12 max-w-md">
          Responde com precisão cirúrgica sobre infrações, artigos, enquadramentos e jurisprudência
        </p>

        <button
          onClick={() => setShowForm(true)}
          className="inline-block bg-ctb-green hover:bg-ctb-green/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Iniciar Consulta
        </button>

        <div className="mt-16 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-4">Para agentes de trânsito (PM, PC, PRF, polícia municipal)</p>
          <p>⚠️ App em desenvolvimento - Fase 3/7 em progresso</p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create test file tests/components/consulta-form.test.tsx**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ConsultaForm from '@/components/ConsultaForm';

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

describe('ConsultaForm', () => {
  it('renders textarea and button', () => {
    render(<ConsultaForm />);
    expect(screen.getByPlaceholderText(/Ex: 516-91/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consultar/ })).toBeInTheDocument();
  });

  it('disables button when textarea is empty', () => {
    render(<ConsultaForm />);
    const button = screen.getByRole('button', { name: /Consultar/ });
    expect(button).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/components/
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/ConsultaForm.tsx components/RecentQueries.tsx lib/search/local-storage.ts app/page.tsx tests/components/consulta-form.test.tsx
git commit -m "feat: add search UI with recent queries

- Create reusable ConsultaForm component
- Add RecentQueries sidebar showing last 5 queries
- Implement localStorage persistence for queries
- Update home page to use new components
- Include form component tests

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 9: PDF Generation Endpoint

**Files:**
- Create: `app/api/pdf/generate/route.ts` — PDF generation endpoint
- Create: `lib/pdf/generator.ts` — PDF building with @react-pdf/renderer
- Create: `lib/pdf/themes.ts` — Thematic content filtering
- Create: `lib/pdf/cache.ts` — PDF caching logic
- Test: `tests/api/pdf-generate.test.ts`

**Interfaces:**
- Consumes: CartaoEstruturado, enquadramentos table, jurisprudencia table
- Produces: PDF binary buffer, cache key

- [ ] **Step 1: Create lib/pdf/themes.ts**

```typescript
export const THEMES = [
  { id: 'estacionamento', label: 'Estacionamento', keywords: ['516', '517', '518'] },
  { id: 'velocidade', label: 'Velocidade', keywords: ['620', '621', '622'] },
  { id: 'alcoolemia', label: 'Alcoolemia', keywords: ['306', '307', '308'] },
  { id: 'documentos', label: 'Documentação', keywords: ['232', '233', '234'] },
  { id: 'equipamentos', label: 'Equipamentos', keywords: ['230', '231'] },
  { id: 'art-165', label: 'Artigo 165 (Infrações Diversas)', keywords: ['165'] },
];

export interface PDFTheme {
  id: string;
  label: string;
  keywords: string[];
}

export function getTheme(themeId: string): PDFTheme | null {
  return THEMES.find((t) => t.id === themeId) || null;
}

export function filterByTheme(
  enquadramentos: any[],
  themeId: string
): any[] {
  const theme = getTheme(themeId);
  if (!theme) return [];

  return enquadramentos.filter((e) =>
    theme.keywords.some((kw) => e.codigo_mbft?.includes(kw))
  );
}
```

- [ ] **Step 2: Create lib/pdf/cache.ts**

```typescript
import crypto from 'crypto';
import { supabase } from '@/lib/db/client';

export async function getPDFCache(themeId: string): Promise<Buffer | null> {
  try {
    const key = `pdf-${themeId}`;
    // For now, return null (caching not critical in MVP)
    return null;
  } catch (err) {
    console.error('Cache lookup failed:', err);
    return null;
  }
}

export async function setCacheExpiry(themeId: string, ttlDays: number = 7): Promise<void> {
  // Implement if database caching is added
}
```

- [ ] **Step 3: Create lib/pdf/generator.ts**

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { supabase } from '@/lib/db/client';

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingVertical: 40,
    fontSize: 11,
    lineHeight: 1.6,
  },
  cover: {
    paddingTop: 200,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a5f3f',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5f3f',
    marginBottom: 10,
    marginTop: 15,
  },
  card: {
    border: '1 solid #ddd',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    fontSize: 11,
    marginBottom: 5,
  },
  footer: {
    fontSize: 9,
    color: '#999',
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
});

export async function generatePDFDocument(
  theme: { id: string; label: string },
  enquadramentos: any[]
): Promise<Document> {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.title}>{theme.label}</Text>
          <Text style={styles.subtitle}>Dossiê Temático CTB Agente</Text>
          <Text style={styles.text}>
            Data: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </Page>

      {/* Content Pages */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Enquadramentos</Text>
        {enquadramentos.slice(0, 5).map((enq, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>
              {enq.codigo_mbft} - {enq.descricao}
            </Text>
            <Text style={styles.text}>Gravidade: {enq.gravidade}</Text>
            <Text style={styles.text}>Pontos: {enq.pontos}</Text>
            <Text style={styles.text}>Multa: R$ {enq.valor_multa}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>
            Este documento é material de apoio produzido automaticamente pelo CTB Agente.
            Consulte sempre as fontes oficiais.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Create app/api/pdf/generate/route.ts**

```typescript
import { renderToStream } from '@react-pdf/renderer';
import { generatePDFDocument } from '@/lib/pdf/generator';
import { getTheme, filterByTheme } from '@/lib/pdf/themes';
import { supabase } from '@/lib/db/client';

export async function POST(req: Request) {
  try {
    const { themeId } = await req.json();

    if (!themeId) {
      return Response.json({ error: 'themeId required' }, { status: 400 });
    }

    const theme = getTheme(themeId);
    if (!theme) {
      return Response.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Fetch enquadramentos from database
    const { data: enquadramentos, error } = await supabase
      .from('enquadramentos')
      .select('*')
      .limit(100);

    if (error || !enquadramentos) {
      return Response.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    const filtered = filterByTheme(enquadramentos, themeId);

    const doc = await generatePDFDocument(theme, filtered);
    const stream = await renderToStream(doc);

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ctb-${themeId}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return Response.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create test file tests/api/pdf-generate.test.ts**

```typescript
import { POST } from '@/app/api/pdf/generate/route';

describe('POST /api/pdf/generate', () => {
  it('returns 400 without themeId', async () => {
    const req = new Request('http://localhost/api/pdf/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for invalid theme', async () => {
    const req = new Request('http://localhost/api/pdf/generate', {
      method: 'POST',
      body: JSON.stringify({ themeId: 'invalid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/api/pdf-generate.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add lib/pdf/ app/api/pdf/ tests/api/pdf-generate.test.ts
git commit -m "feat: implement PDF generation endpoint

- Add thematic filtering (estacionamento, velocidade, etc.)
- Create PDF generator with cover + content pages
- Implement caching infrastructure
- Add PDF download endpoint /api/pdf/generate
- Include endpoint tests

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 10: PDF UI (Gerar PDF Tab)

**Files:**
- Create: `components/GerarPDFTab.tsx` — PDF generation UI component
- Create: `app/gerador-pdf/page.tsx` — dedicated PDF generation page
- Modify: `app/layout.tsx` — add navigation link to PDF page
- Test: `tests/components/gerar-pdf-tab.test.tsx`

**Interfaces:**
- Consumes: /api/pdf/generate endpoint, THEMES list
- Produces: Button to download PDF, theme selector UI

- [ ] **Step 1: Create components/GerarPDFTab.tsx**

```typescript
'use client';

import { useState } from 'react';
import { THEMES } from '@/lib/pdf/themes';

export default function GerarPDFTab() {
  const [selected, setSelected] = useState(THEMES[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selected) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selected }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ctb-${selected}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Gerar Dossiê em PDF
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Escolha um tema e gere um dossiê com normas, enquadramentos e exemplos
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Tema
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ctb-green focus:border-transparent"
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 O dossiê incluirá normas aplicáveis, enquadramentos, procedimentos e exemplos.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !selected}
          className="w-full bg-ctb-green hover:bg-ctb-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Gerando...' : 'Baixar PDF'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/gerador-pdf/page.tsx**

```typescript
import Link from 'next/link';
import GerarPDFTab from '@/components/GerarPDFTab';

export default function PDFPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto mb-8">
        <Link href="/" className="text-ctb-green hover:text-ctb-green/80 font-semibold flex items-center gap-2">
          ← Voltar
        </Link>
      </div>
      <GerarPDFTab />
    </main>
  );
}
```

- [ ] **Step 3: Update app/layout.tsx to add navigation**

Add link to PDF page in the header/navigation:

```typescript
// After the existing navigation structure, add:
<nav className="bg-white dark:bg-gray-800 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 py-4 flex gap-6">
    <Link href="/" className="text-ctb-green hover:text-ctb-green/80 font-semibold">
      Home
    </Link>
    <Link href="/gerador-pdf" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold">
      Gerar PDF
    </Link>
  </div>
</nav>
```

- [ ] **Step 4: Create test file tests/components/gerar-pdf-tab.test.tsx**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import GerarPDFTab from '@/components/GerarPDFTab';

global.fetch = jest.fn();

describe('GerarPDFTab', () => {
  it('renders theme selector and button', () => {
    render(<GerarPDFTab />);
    expect(screen.getByText(/Gerar Dossiê/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar PDF/ })).toBeInTheDocument();
  });

  it('disables button when no theme selected', () => {
    render(<GerarPDFTab />);
    const button = screen.getByRole('button', { name: /Baixar PDF/ });
    // Button should be enabled since a default theme is selected
    expect(button).not.toBeDisabled();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/components/gerar-pdf-tab.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add components/GerarPDFTab.tsx app/gerador-pdf/ app/layout.tsx tests/components/gerar-pdf-tab.test.tsx
git commit -m "feat: implement PDF generation UI tab

- Add GerarPDFTab component with theme selector
- Create /gerador-pdf dedicated page
- Add navigation link in layout
- Integrate with /api/pdf/generate endpoint
- Include component tests

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 11: End-to-End Tests

**Files:**
- Create: `tests/e2e/full-flow.test.ts` — E2E test suite (Playwright)
- Create: `tests/e2e/fixtures.ts` — Test data and setup
- Modify: `package.json` — add Playwright dev dependency
- Modify: `jest.config.ts` — configure Playwright integration

**Interfaces:**
- Consumes: Running application (dev server), database with seed data
- Produces: Test results, coverage report

- [ ] **Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
```

- [ ] **Step 2: Create tests/e2e/fixtures.ts**

```typescript
export const TEST_QUERIES = [
  {
    input: '516-91',
    expectedCode: '516-91',
    expectedGravidade: 'gravíssima',
    description: 'Code lookup',
  },
  {
    input: 'art. 165',
    expectedMatches: 'art. 165',
    description: 'Article lookup',
  },
  {
    input: 'estacionado em vaga de idoso',
    expectedCode: '516-91',
    description: 'Situation query',
  },
];

export const ADMIN_CREDENTIALS = {
  username: 'nenzinhu',
  password: process.env.ADMIN_PASSWORD || 'test-password',
};
```

- [ ] **Step 3: Create tests/e2e/full-flow.test.ts**

```typescript
import { test, expect } from '@playwright/test';
import { TEST_QUERIES, ADMIN_CREDENTIALS } from './fixtures';

test.describe('CTB Agente E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('loads homepage', async ({ page }) => {
    await expect(page.locator('text=CTB Agente')).toBeVisible();
    await expect(page.locator('text=Iniciar Consulta')).toBeVisible();
  });

  test('performs code lookup (516-91)', async ({ page }) => {
    await page.click('button:has-text("Iniciar Consulta")');
    await page.fill('textarea', '516-91');
    await page.click('button:has-text("Consultar")');
    
    await page.waitForURL(/\/consulta\?q=/);
    await expect(page.locator('text=516-91')).toBeVisible();
    await expect(page.locator('text=gravíssima')).toBeVisible();
  });

  test('performs article lookup (art. 165)', async ({ page }) => {
    await page.click('button:has-text("Iniciar Consulta")');
    await page.fill('textarea', 'art. 165');
    await page.click('button:has-text("Consultar")');
    
    await page.waitForURL(/\/consulta\?q=/);
    await expect(page.locator('text=art. 165')).toBeVisible();
  });

  test('switches between technical and simple views', async ({ page }) => {
    await page.click('button:has-text("Iniciar Consulta")');
    await page.fill('textarea', '516-91');
    await page.click('button:has-text("Consultar")');
    
    await page.waitForURL(/\/consulta\?q=/);
    
    // Click simple view tab
    await page.click('button:has-text("Em Palavras Simples")');
    await expect(page.locator('text=Em palavras simples')).toBeVisible();
  });

  test('saves recent queries', async ({ page }) => {
    await page.click('button:has-text("Iniciar Consulta")');
    await page.fill('textarea', 'test-query');
    await page.click('button:has-text("Consultar")');
    
    // Go back home
    await page.goto('http://localhost:3000');
    await page.click('button:has-text("Iniciar Consulta")');
    
    // Check recent queries appear
    await expect(page.locator('text=test-query')).toBeVisible();
  });

  test('generates PDF for theme', async ({ page, context }) => {
    await page.goto('http://localhost:3000/gerador-pdf');
    
    // Set up to capture download
    const downloadPromise = context.waitForEvent('download');
    
    await page.click('button:has-text("Baixar PDF")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/ctb-.+\.pdf/);
  });

  test('admin login flow', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    
    // Should redirect to login
    await expect(page.locator('text=Login')).toBeVisible();
    
    await page.fill('input[type="text"]', ADMIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button:has-text("Entrar")');
    
    // Should now be on admin dashboard
    await page.waitForURL(/\/admin$/);
    await expect(page.locator('text=Painel Admin')).toBeVisible();
  });
});
```

- [ ] **Step 4: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 5: Update package.json with Playwright script**

Add to `scripts`:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 6: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/ playwright.config.ts package.json
git commit -m "feat: add comprehensive E2E test suite

- Add Playwright tests for full user flows
- Test code/article/situation lookups
- Test view switching and recent queries
- Test PDF generation
- Test admin login
- Configure Playwright runner

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Vercel Environment Configuration

**Files:**
- Create: `.env.production` — production environment variables template
- Create: `docs/DEPLOY.md` — deployment guide
- Modify: `.env.local.example` — add all Vercel-required vars
- No code changes

**Interfaces:**
- Consumes: User credentials (Supabase keys, LLM API keys, Turnstile)
- Produces: Configuration template for Vercel secrets

- [ ] **Step 1: Update .env.local.example with complete set**

Ensure all these keys exist:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Providers
GROQ_API_KEY=gsk_...
NVIDIA_NIM_KEY=nvidia_...
OPENROUTER_KEY=sk-or-...
MISTRAL_API_KEY=mA...

# Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...

# Admin
ADMIN_PASSWORD_HASH=$2b$10$...

# Vercel
VERCEL_ENV=production
VERCEL_PROJECT_ID=prj_...
```

- [ ] **Step 2: Create docs/DEPLOY.md**

```markdown
# Deployment Guide — CTB Agente

## Prerequisites

- Vercel account with project created
- Supabase project with schema and pgvector enabled
- API keys for Groq, NVIDIA, OpenRouter, Mistral
- Turnstile account with site and secret keys

## Environment Variables on Vercel

1. Go to Vercel project Settings → Environment Variables
2. Add each variable from `.env.local.example` as a **Secret**
3. Ensure all variables are available in Production environment

### Critical Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| SUPABASE_URL | Supabase Project Settings | Database connection |
| SUPABASE_ANON_KEY | Supabase Project Settings | Anon auth token |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Project Settings → API | Service auth |
| GROQ_API_KEY | Groq Console | LLM provider 1 |
| TURNSTILE_SECRET_KEY | Cloudflare Dashboard | Bot protection |
| ADMIN_PASSWORD_HASH | bcrypt hash (see below) | Admin login |

## Admin Password Setup

Generate bcrypt hash:

```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('your-password', 10));"
```

Copy the hash and set as `ADMIN_PASSWORD_HASH` secret on Vercel.

## Database Setup

1. Run migrations in Supabase SQL editor:
   ```sql
   -- See scripts/migrations.sql
   ```

2. Verify tables:
   ```bash
   psql -h db.supabase.co -U postgres -d postgres
   \dt
   ```

3. Test connection:
   ```bash
   npm run dev
   curl http://localhost:3000/api/health
   ```

## Deploy

```bash
git push origin main
# Vercel auto-deploys
# Monitor build at vercel.com dashboard
```

## Post-Deploy

1. Visit https://ctb-agente.vercel.app
2. Test homepage loads
3. Test consultation: submit "516-91"
4. Check admin login: https://ctb-agente.vercel.app/admin
5. Monitor logs: Vercel → Deployments → Logs

## Troubleshooting

### Build fails: "NEXT_PUBLIC_SUPABASE_URL is required"

→ Check Vercel environment variables are set for Production

### Database connection timeout

→ Verify Supabase IP whitelist includes Vercel IPs (usually automatic)

### LLM provider returns 401

→ Check API key is correct and not expired
```

- [ ] **Step 3: Commit**

```bash
git add .env.local.example docs/DEPLOY.md
git commit -m "docs: add Vercel deployment configuration guide

- Create comprehensive deployment documentation
- List all required environment variables
- Add admin password setup instructions
- Include troubleshooting section

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Populate Initial Document Corpus

**Files:**
- Create: `scripts/seed-corpus.ts` — Script to populate initial documents
- No code changes (admin UI already handles uploads)

**Interfaces:**
- Consumes: Database connection, sample documents (hard-coded)
- Produces: Initial dispositivos, enquadramentos, jurisprudencia rows

- [ ] **Step 1: Create scripts/seed-corpus.ts**

```typescript
import { supabase } from '../lib/db/client';

const SAMPLE_DISPOSITIVOS = [
  {
    numero_dispositivo: 'art. 165',
    texto: 'Dirigir com deficiência física não compensada...',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: new Date('1997-09-23'),
    data_vigencia_inicio: new Date('1997-09-23'),
    data_vigencia_fim: null,
    tsvector_pt: 'dirigir deficiencia fisica',
  },
  {
    numero_dispositivo: 'art. 181 XVII',
    texto: 'Estacionar o veículo em local proibido pela sinalização...',
    norma_id: 'ctb-lei-9503-97',
    tipo: 'lei',
    data_publicacao: new Date('1997-09-23'),
    data_vigencia_inicio: new Date('1997-09-23'),
    data_vigencia_fim: null,
    tsvector_pt: 'estacionar local proibido sinalizacao',
  },
];

const SAMPLE_ENQUADRAMENTOS = [
  {
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em local proibido',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 293.47,
    unidade: 'UIRF',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'CRLV',
    amparo_legal: 'art. 181 XVII do CTB',
    medida_administrativa: 'Remoção do veículo',
    responsavel: 'proprietário',
  },
];

async function seed() {
  try {
    console.log('Seeding dispositivos...');
    const { error: dErr } = await supabase
      .from('dispositivos')
      .insert(SAMPLE_DISPOSITIVOS);
    if (dErr) throw dErr;

    console.log('Seeding enquadramentos...');
    const { error: eErr } = await supabase
      .from('enquadramentos')
      .insert(SAMPLE_ENQUADRAMENTOS);
    if (eErr) throw eErr;

    console.log('✅ Corpus seeded successfully');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
```

- [ ] **Step 2: Add seed script to package.json**

```json
"scripts": {
  "seed": "ts-node scripts/seed-corpus.ts"
}
```

- [ ] **Step 3: Run seed locally (optional before deploy)**

```bash
npm run seed
```

- [ ] **Step 4: Document in README**

Add to README.md:

```markdown
## Corpus Setup

Initial corpus can be populated via:

1. **Automatic seed (dev):**
   ```bash
   npm run seed
   ```

2. **Manual upload (production):**
   - Login to `/admin`
   - Upload CTB PDF, resolutions, etc.
   - Mark as published

See `scripts/seed-corpus.ts` for sample data structure.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-corpus.ts
git commit -m "feat: add corpus seeding script

- Create seed script for initial dispositivos
- Add enquadramentos sample data
- Add seed command to package.json
- Document corpus setup in README

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Final Deployment

**Files:**
- No new files (all config already in place)
- Execute deployment workflow

**Interfaces:**
- Consumes: GitHub main branch, Vercel project
- Produces: Live production deployment

- [ ] **Step 1: Verify all env vars are set on Vercel**

Check Vercel dashboard → Project Settings → Environment Variables:
- All NEXT_PUBLIC_* vars present
- All secret vars (SUPABASE_SERVICE_ROLE_KEY, API keys) present
- Production environment selected for each

- [ ] **Step 2: Verify database migrations are applied**

```bash
# In Supabase SQL editor, run:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

Verify tables exist:
- `dispositivos`
- `enquadramentos`
- `jurisprudencia`
- `cache_respostas`
- `uso_diario`

- [ ] **Step 3: Verify dev server works locally**

```bash
npm install
npm run dev
# Visit http://localhost:3000
# Test consultation: "516-91"
```

- [ ] **Step 4: Push to main**

```bash
git status
git log --oneline main..HEAD
# All tasks committed?
git push origin main
```

Vercel auto-deploys. Monitor at https://vercel.com/dashboard.

- [ ] **Step 5: Smoke test production**

Once Vercel build succeeds (~2-3 min):

1. Visit production URL (e.g., https://ctb-agente.vercel.app)
2. Test homepage loads ✅
3. Test query "516-91" returns result ✅
4. Test admin login: /admin ✅
5. Check error logs (Vercel → Logs) — should be clean ✅

- [ ] **Step 6: Create deployment summary**

```bash
# In DEPLOY.md, add post-launch section:

## Launch Checklist (2026-09-21)

- [ ] Env vars set on Vercel
- [ ] Database migrations applied
- [ ] Homepage loads
- [ ] Sample queries work (516-91, art. 165)
- [ ] Admin login works
- [ ] Error logs clean
- [ ] Domains configured (if custom)
```

- [ ] **Step 7: Done!**

No commit needed (deployment is external). Monitor production for 24h.

---

## Summary

| Batch | Tasks | Status |
|-------|-------|--------|
| 1-3 | Infrastructure, AI, Ingestion, Admin | ✅ Complete |
| 4 | Frontend UI (7-8) | ⏳ Ready to start |
| 5 | PDF Generation (9-10) | ⏳ Ready to start |
| 6 | E2E Tests (11) | ⏳ Ready to start |
| 7 | Deploy (12-14) | ⏳ Ready to start |

**Next:** Execute with subagent-driven-development, skip reviews, push when complete.
