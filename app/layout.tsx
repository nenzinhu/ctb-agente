import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'CTB Agente',
  description: 'Consulta legislação de trânsito brasileira com IA',
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
  themeColor: '#1a5f3f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
