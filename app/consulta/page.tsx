'use client';

import { Suspense } from 'react';
import ConsultaPageContent from './content';

export default function ConsultaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConsultaPageContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <main className="page-narrow" role="status" aria-live="polite">
      <div className="skeleton mb-4 h-9 w-36" />
      <div className="skeleton h-8 w-64" />
      <span className="sr-only">Carregando...</span>
    </main>
  );
}
