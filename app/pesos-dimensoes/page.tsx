import type { Metadata } from 'next';

import CalculadoraPesos from '@/components/pesos-dimensoes/CalculadoraPesos';
import PerguntasPesos from '@/components/pesos-dimensoes/PerguntasPesos';

export const metadata: Metadata = {
  title: 'Pesos e Dimensões',
  description: 'Calculadora operacional de PBT, PBTC, CMT, excesso de peso e enquadramento com fontes oficiais.',
};

export default function PesosDimensoesPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <h1 className="consultation-title">Calcular peso e dimensões</h1>
        <p className="consultation-lead">Selecione o veículo, informe os pesos e calcule o excesso.</p>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CalculadoraPesos />
        <aside className="lg:sticky lg:top-32"><details className="support-details"><summary>Orientações e fontes</summary><div className="space-y-5">
          <PerguntasPesos />
        </div></details></aside>
      </div>
    </main>
  );
}
