import type { Metadata } from 'next';

import CalculadoraPesos from '@/components/pesos-dimensoes/CalculadoraPesos';
import PerguntasPesos from '@/components/pesos-dimensoes/PerguntasPesos';
import Icone from '@/components/ui/Icone';

export const metadata: Metadata = {
  title: 'Pesos e Dimensões',
  description: 'Calculadora operacional de PBT, PBTC, CMT, excesso de peso e enquadramento com fontes oficiais.',
};

export default function PesosDimensoesPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <p className="eyebrow">Ferramenta para o agente de campo</p>
        <h1 className="consultation-title">PESOS E DIMENSÕES</h1>
        <p className="consultation-lead">Confira o limite do conjunto, a capacidade máxima de carga, tolerâncias, excesso autuável, código e valor estimado.</p>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CalculadoraPesos />
        <aside className="space-y-5 lg:sticky lg:top-32">
          <div className="search-guide" aria-labelledby="guia-pesos">
            <span className="search-guide-icon"><Icone nome="balanca" tamanho={18} /></span>
            <h2 id="guia-pesos" className="mt-3 text-lg font-semibold">Conferência guiada</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ds-subtle">
              <li>Escolha a configuração pelo desenho.</li>
              <li>Confira tara, PBT/PBTC técnico, CMT e AET.</li>
              <li>Informe peso da nota ou da balança.</li>
              <li>Revise memória, código, responsável e providência.</li>
            </ol>
            <p className="mt-4 border-t border-ds-line pt-3 text-xs text-ds-subtle">A tolerância serve somente à fiscalização por balança e não aumenta a capacidade de carga.</p>
          </div>
          <PerguntasPesos />
        </aside>
      </div>
    </main>
  );
}
