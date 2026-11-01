import type { Metadata } from 'next';
import GerarApostila from '@/components/GerarApostila';

export const metadata: Metadata = {
  title: 'Apostila com IA',
  description: 'Apostilas de estudo geradas por IA a partir dos documentos indexados do acervo.',
};

export default function ApostilaPage() {
  return (
    <main className="page-narrow">
      <GerarApostila />
    </main>
  );
}
