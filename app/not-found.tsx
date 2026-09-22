import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-5xl font-bold text-ctb-green">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Página não encontrada
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          O endereço acessado não existe neste aplicativo.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/?form=1"
            className="rounded-lg bg-ctb-green px-5 py-2 font-semibold text-white hover:bg-ctb-green/90"
          >
            Fazer uma consulta
          </Link>
          <Link
            href="/gerador-pdf"
            className="rounded-lg border border-ctb-green px-5 py-2 font-semibold text-ctb-green hover:bg-ctb-green/10"
          >
            Gerar dossiê em PDF
          </Link>
        </div>
      </div>
    </main>
  );
}
