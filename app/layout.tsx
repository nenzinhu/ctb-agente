import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a5f3f' },
    { media: '(prefers-color-scheme: dark)', color: '#09100d' },
  ],
};

// Applies the saved "modo sol" before the first paint, so the page never
// flashes the default palette under the sun. Mirrors components/TemaToggle.tsx.
const TEMA_SALVO = `try{if(localStorage.getItem('ctb-tema')==='sol'){document.documentElement.dataset.tema='sol'}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SALVO }} />
      </head>
      <body className="min-h-screen font-sans">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        <NavBar />
        <div id="conteudo" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
