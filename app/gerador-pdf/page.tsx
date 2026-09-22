import type { Metadata } from 'next';
import Link from 'next/link';
import GerarPDFTab from '@/components/GerarPDFTab';

export const metadata: Metadata = {
  title: 'Gerar dossiê em PDF — CTB Agente',
  description: 'Gere dossiês temáticos de fiscalização de trânsito em PDF',
};

export default function PDFPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link
          href="/"
          className="text-ctb-green hover:text-opacity-80 font-semibold inline-block py-2 sm:py-0"
        >
          ← Voltar
        </Link>
      </div>
      <GerarPDFTab />
    </main>
  );
}
