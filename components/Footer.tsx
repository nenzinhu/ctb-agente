export default function Footer() {
  return (
    <footer className="border-t-4 border-ds-accent bg-ds-surface print:hidden" aria-label="Informações institucionais">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-center text-xs leading-relaxed text-ds-subtle sm:px-6">
        <p className="font-display text-base font-bold uppercase tracking-[0.04em] text-ds-text">CTB Agente · Manual de campo</p>
        <p>Desenvolvido pelo Cabo Jeferson para consulta operacional.</p>
        <p>Ferramenta de apoio. Confira sempre a fonte vigente antes da atuação.</p>
      </div>
    </footer>
  );
}
