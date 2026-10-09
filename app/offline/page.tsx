import Link from 'next/link';
import Icone from '@/components/ui/Icone';

export default function OfflinePage() {
  return (
    <main className="page grid min-h-[70vh] place-items-center">
      <section className="card card-pad max-w-lg text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ds-primary-soft text-ds-primary-strong">
          <Icone nome="alerta" tamanho={26} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ds-text">Você está sem conexão</h1>
        <p className="mt-3 leading-relaxed text-ds-subtle">
          A interface continua disponível, mas consultas jurídicas atuais exigem internet para evitar conteúdo desatualizado.
        </p>
        <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
      </section>
    </main>
  );
}
