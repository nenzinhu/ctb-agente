import type { Metadata } from 'next';
import GerarPDFTab from '@/components/GerarPDFTab';

export const metadata: Metadata = {
  title: 'Dossiê em PDF',
  description: 'Gere dossiês temáticos de fiscalização de trânsito em PDF',
};

export default function PDFPage() {
  return (
    <main className="page-narrow">
      <GerarPDFTab />
    </main>
  );
}
