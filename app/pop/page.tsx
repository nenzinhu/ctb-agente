import type { Metadata } from 'next';
import PopConsulta from '@/components/pop/PopConsulta';
import PopBiblioteca from '@/components/pop/PopBiblioteca';
import Icone from '@/components/ui/Icone';

export const metadata: Metadata = {
  title: 'POP-PMSC',
  description: 'Consulta aos Procedimentos Operacionais Padrão da Polícia Militar de Santa Catarina, com a fonte de cada resposta.',
};

export default function PopPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <p className="eyebrow">Apoio ao serviço operacional</p>
        <h1 className="consultation-title">POP-PMSC</h1>
        <p className="consultation-lead">Encontre o procedimento e confira os trechos que orientam a resposta.</p>
      </div>

      <div className="mt-7 grid grid-cols-1 items-start gap-6 sm:mt-9 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PopConsulta />
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-32" aria-label="Ajuda e documentos dos POPs">
          <section className="search-guide" aria-labelledby="dica-pop">
            <span className="search-guide-icon"><Icone nome="busca" tamanho={18} /></span>
            <h2 id="dica-pop" className="mt-3 text-lg font-semibold text-ds-text">Pergunte do seu jeito</h2>
            <p className="mt-2 text-sm leading-relaxed text-ds-subtle">
              Use o número do POP, o nome do procedimento ou a situação. Tente “revista pessoal” ou “abordag”.
            </p>
            <p className="mt-3 border-t border-ds-line pt-3 text-xs leading-relaxed text-ds-subtle">
              Inclua o contexto: abordagem a pessoa ou veículo, acidente com ou sem vítima. Isso ajuda a distinguir os procedimentos.
            </p>
          </section>
          <PopBiblioteca />
        </aside>
      </div>
    </main>
  );
}
