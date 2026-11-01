import type { Metadata } from 'next';
import CasosPraticos from '@/components/CasosPraticos';

export const metadata: Metadata = {
  title: 'Casos práticos',
  description: 'Treine o enquadramento com situações reais do MBFT: leia a cena e escolha a infração certa.',
};

export default function CasosPage() {
  return (
    <main className="page-narrow">
      <CasosPraticos />
    </main>
  );
}
