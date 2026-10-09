import type { Metadata } from 'next';
import FatosPmscConsulta from '@/components/fatos-pmsc/FatosPmscConsulta';
import Icone from '@/components/ui/Icone';

export const metadata: Metadata = {
  title: 'Lista de Fatos (PMSC Mobile)',
  description: 'Consulta por grupo, natureza e potencial ofensivo na Lista de Fatos PMSC Mobile.',
};

export default function FatosPmscPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <p className="eyebrow">Consulta operacional</p>
        <h1 className="consultation-title">LISTA DE FATOS (PMSC MOBILE)</h1>
        <p className="consultation-lead">Encontre grupo, natureza e potencial ofensivo usando a descrição da ocorrência.</p>
      </div>
      <div className="mt-7 grid grid-cols-1 items-start gap-6 sm:mt-9 lg:grid-cols-[minmax(0,1fr)_300px]">
        <FatosPmscConsulta />
        <aside className="search-guide lg:sticky lg:top-32" aria-labelledby="dica-fatos">
          <span className="search-guide-icon"><Icone nome="info" tamanho={18} /></span>
          <h2 id="dica-fatos" className="mt-3 text-lg font-semibold text-ds-text">Descreva como aconteceu</h2>
          <p className="mt-2 text-sm leading-relaxed text-ds-subtle">Você pode usar termos incompletos, abreviações e expressões comuns do serviço.</p>
          <p className="mt-3 border-t border-ds-line pt-3 text-xs leading-relaxed text-ds-subtle">Os resultados reproduzem registros da lista. Quando houver alternativas, confira qual corresponde ao fato constatado.</p>
        </aside>
      </div>
    </main>
  );
}
