import type { Metadata } from 'next';
import GerarApostila from '@/components/GerarApostila';

export const metadata: Metadata = {
  title: 'Apostila por IA',
  description: 'Apostilas de estudo geradas por IA a partir das fichas do MBFT e dos POPs da PMSC.',
};

export default function ApostilaPage() {
  return (
    <main className="page-narrow">
      <GerarApostila />
    </main>
  );
}
