import Link from 'next/link';
import Icone from '@/components/ui/Icone';

export default function NotFound() {
  return (
    <main className="page-narrow flex flex-col items-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icone nome="busca" tamanho={28} />
      </span>
      <p className="mt-5 text-sm font-semibold text-brand">Erro 404</p>
      <h1 className="page-title mt-1">Página não encontrada</h1>
      <p className="page-lead">O endereço acessado não existe neste aplicativo.</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/?form=1" className="btn-primary">
          Fazer uma consulta
        </Link>
        <Link href="/pop" className="btn-secondary">
          Consultar os POPs
        </Link>
      </div>
    </main>
  );
}
