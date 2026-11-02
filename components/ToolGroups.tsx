import Link from 'next/link';
import { destinoAtivo, GRUPOS_FERRAMENTAS } from '@/lib/navigation';
import Icone from './ui/Icone';

/** Shared destination names and grouping for the home page and both menus. */
export default function ToolGroups({ pathname = '', onNavigate }: { pathname?: string; onNavigate?: () => void }) {
  return (
    <div className="tool-groups">
      {GRUPOS_FERRAMENTAS.map((grupo) => (
        <div key={grupo.titulo} className="tool-group">
          <h3 className="tool-group-title">{grupo.titulo}</h3>
          <ul className="space-y-1">
            {grupo.itens.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onNavigate} className="tool-destination" aria-current={destinoAtivo(item.href, pathname) ? 'page' : undefined}>
                  <Icone nome={item.icone} tamanho={20} className="mt-0.5 shrink-0 text-ds-primary-strong" />
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold">{item.label}</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-ds-subtle">{item.descricao}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
