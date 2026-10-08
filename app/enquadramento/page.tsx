import type { Metadata } from 'next';
import EnquadramentoGuiado from '@/components/EnquadramentoGuiado';
import Icone from '@/components/ui/Icone';

export const metadata: Metadata = {
  title: 'Enquadramento guiado',
  description: 'Compare fichas oficiais do MBFT a partir da situação observada, sem decisão automática.',
};

export default function EnquadramentoPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <p className="eyebrow">Apoio à conferência do auto</p>
        <h1 className="consultation-title">Enquadramento guiado</h1>
        <p className="consultation-lead">Descreva o fato, responda apenas o que foi observado e compare até três fichas oficiais.</p>
      </div>
      <div className="mt-7 grid grid-cols-1 items-start gap-6 sm:mt-9 lg:grid-cols-[minmax(0,1fr)_300px]">
        <EnquadramentoGuiado />
        <aside className="search-guide lg:sticky lg:top-32" aria-labelledby="como-usar-guiado">
          <span className="search-guide-icon"><Icone nome="info" tamanho={18} /></span>
          <h2 id="como-usar-guiado" className="mt-3 text-lg font-semibold text-ds-text">Conferência humana obrigatória</h2>
          <p className="mt-2 text-sm leading-relaxed text-ds-subtle">As perguntas vêm dos campos “Quando autuar” e “Quando não autuar” das fichas MBFT.</p>
          <p className="mt-3 border-t border-ds-line pt-3 text-xs leading-relaxed text-ds-subtle">A ordem indica compatibilidade com as respostas, não uma conclusão jurídica. Confira tipificação, amparo e circunstâncias antes de decidir.</p>
        </aside>
      </div>
    </main>
  );
}
