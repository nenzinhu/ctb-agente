export default function Footer() {
  return (
    <footer className="border-t border-ds-line bg-ds-surface" aria-label="Informações institucionais">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-center text-xs leading-relaxed text-ds-subtle sm:px-6">
        <p className="font-semibold text-ds-text">CTB Agente — desenvolvido pelo Cabo Jeferson</p>
        <p>Ferramenta de apoio à consulta. Confira sempre a fonte vigente antes da atuação.</p>
      </div>
    </footer>
  );
}
