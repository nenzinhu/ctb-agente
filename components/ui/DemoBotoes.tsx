import { type NomeIcone } from './ui/Icone';

/**
 * Exemplo de botões demonstrando o Design System PMRV-SC.
 * Paleta: Primary #0F623F / Accent #1DA860.
 */
export default function DemoBotoes() {
  const icones: NomeIcone[] = ['busca', 'escudo', 'arquivo', 'comprimir', 'seta', 'engrenagem'];

  return (
    <div className="container-centro space-y-8">
      <h1 className="titulo-secundario text-center">Botões — Design System</h1>

      {/* Linha 1: primários */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary">
          <span className="mr-1.5">{icones.map((n) => n)[0]}</span>
          Botão Primário
        </button>
        <button className="btn-primary-accent">
          <span className="mr-1.5">{icones.map((n) => n)[2]}</span>
          Botão Accent
        </button>
        <button className="btn-primary btn-sm">Pequeno</button>
        <button className="btn-primary btn-lg">Grande</button>
        <button className="btn-primary btn-icon" title="Ações">
          <span className="sr-only">Ações</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>

      {/* Linha 2: secundários */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary">Secundário</button>
        <button className="btn-ghost">Ghost</button>
        <button className="btn-danger">Excluir</button>
        <button className="btn-secondary btn-sm">Sm</button>
      </div>

      {/* Linha 3: estados */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled>Desabilitado</button>
        <button className="btn-primary">Normal</button>
        <a href="#" className="btn-primary inline-flex items-center gap-2">Link como botão →</a>
      </div>
    </div>
  );
}
