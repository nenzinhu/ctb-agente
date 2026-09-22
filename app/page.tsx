export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          CTB Agente
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Consulta legislação de trânsito brasileira com IA
        </p>
        <div className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
          Iniciar
        </div>
      </div>
    </main>
  );
}
