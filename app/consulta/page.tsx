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
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando...</p>
        </div>
      </div>
    </main>
  );
}
