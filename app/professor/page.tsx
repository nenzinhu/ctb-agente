import type { Metadata } from 'next';
import Professor from '@/components/Professor';

export const metadata: Metadata = {
  title: 'Professor Emérito',
  description:
    'Pergunte sobre CTB, infrações do MBFT e procedimentos dos POPs, com explicações e fontes.',
};

export default function ProfessorPage() {
  return (
    <main className="page-narrow">
      <Professor />
    </main>
  );
}
