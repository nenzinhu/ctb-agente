import type { Metadata } from 'next';
import Professor from '@/components/Professor';

export const metadata: Metadata = {
  title: 'Professor Grão-Mestre em Trânsito',
  description:
    'Pergunte sobre o CTB: infrações, explicações com exemplos do dia a dia, jurisprudência, alterações na lei e projetos em tramitação.',
};

export default function ProfessorPage() {
  return (
    <main className="page-narrow">
      <Professor />
    </main>
  );
}
