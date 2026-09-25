import Link from 'next/link';
import TitleCard from '@/components/ui/TitleCard';

export default function NotFound() {
  return (
    <main className="page-narrow py-16">
      <TitleCard titulo="Página não encontrada" icone="busca" subtitulo="Erro 404: o endereço acessado não existe neste aplicativo.">
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/?form=1" className="btn-primary">
            Fazer uma consulta
          </Link>
          <Link href="/pop" className="btn-secondary">
            Consultar os POPs
          </Link>
        </div>
      </TitleCard>
    </main>
  );
}
