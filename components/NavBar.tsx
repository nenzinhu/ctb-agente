import Link from 'next/link';
import TemaToggle from './TemaToggle';

const LINKS = [
  { href: '/', label: 'Consulta' },
  { href: '/gerador-pdf', label: 'Gerar PDF' },
  // The panel is behind the auth middleware: prefetching it while the visitor is
  // anonymous caches the redirect to /admin/login in the client router, and the
  // stale entry then swallows the navigation right after a successful login.
  { href: '/admin', label: 'Painel', prefetch: false },
];

/**
 * Application shell navigation, shared by every page
 */
export default function NavBar() {
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-ctb-green text-white print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="block py-3 text-base font-bold tracking-tight sm:py-0">
          🚦 CTB Agente
        </Link>

        <ul className="flex flex-1 flex-wrap items-center gap-4 text-sm font-medium">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={link.prefetch ?? true}
                className="block rounded px-2 py-3 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:py-1"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <TemaToggle />
      </div>
    </nav>
  );
}
