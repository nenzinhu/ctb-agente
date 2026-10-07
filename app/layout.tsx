import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: { default: 'CTB Agente', template: '%s · CTB Agente' },
  description:
    'Consulta de legislação de trânsito (CTB) e dos POPs da PMSC com busca inteligente: enquadramentos, artigos e procedimentos com a fonte ao lado.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CTB Agente',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Meta tags can't read CSS variables: this is the top of the header,
  // --ds-header-from under --ds-header-scrim (app/globals.css).
  themeColor: '#01552e',
};

// Applies the saved themes before the first paint, so the page never flashes
// the wrong palette: "modo sol" (components/TemaToggle.tsx) and the dark theme
// (components/TemaEscuroToggle.tsx, which follows the system until chosen).
const TEMA_SALVO = `(function(){var d=document.documentElement,t=null,e=null;try{t=localStorage.getItem('ctb-tema');e=localStorage.getItem('ctb-escuro')}catch(x){}if(t==='sol')d.dataset.tema='sol';if(e==='1'||(e!=='0'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SALVO }} />
      </head>
      <body className="min-h-screen font-sans">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-control focus:bg-ds-surface focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:font-semibold focus:uppercase focus:text-ds-text focus:shadow-overlay"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <div id="conteudo" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
