import type { Metadata } from 'next';
import EstrangeirosConsulta from '@/components/estrangeiros/EstrangeirosConsulta';

export const metadata: Metadata = {
  title: 'Condutores e Veículos Estrangeiros',
  description: 'Assistente de campo para conferir habilitação e veículos estrangeiros com base no CTB e MBFT.',
};

export default function EstrangeirosPage() {
  return (
    <main className="page max-w-6xl">
      <div className="consultation-intro">
        <p className="eyebrow">Conferência para o agente de campo</p>
        <h1 className="consultation-title">CONDUTORES E VEÍCULOS ESTRANGEIROS</h1>
        <p className="consultation-lead">Confira documentos, condições de circulação e possíveis enquadramentos sem presumir acordos internacionais ou substituir a conferência do agente.</p>
      </div>
      <div className="mt-7"><EstrangeirosConsulta /></div>
    </main>
  );
}
