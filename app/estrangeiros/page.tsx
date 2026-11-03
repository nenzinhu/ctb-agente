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
        <h1 className="consultation-title">Condutores e veículos estrangeiros</h1>
        <p className="consultation-lead">Consulte uma situação ou preencha os dados da fiscalização.</p>
      </div>
      <div className="mt-7"><EstrangeirosConsulta /></div>
    </main>
  );
}
