import type { Metadata } from 'next';
import PopConsulta from '@/components/pop/PopConsulta';
import PopBiblioteca from '@/components/pop/PopBiblioteca';

export const metadata: Metadata = {
  title: 'POP-PMSC',
  description: 'Consulta aos Procedimentos Operacionais Padrão da Polícia Militar de Santa Catarina, com a fonte de cada resposta.',
};

export default function PopPage() {
  return (
    <main className="page max-w-6xl">
      <p className="eyebrow">Procedimentos Operacionais Padrão</p>
      <h1 className="page-title">POP-PMSC</h1>
      <p className="page-lead">
        Pergunte como proceder e receba a resposta com o POP, a seção e a página de onde ela veio.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PopConsulta />
        <aside className="lg:sticky lg:top-24">
          <PopBiblioteca />
        </aside>
      </div>
    </main>
  );
}
