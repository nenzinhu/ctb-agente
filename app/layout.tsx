import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CTB Agente',
  description: 'Consulta legislação de trânsito brasileira com IA',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#1a5f3f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CTB Agente" />
      </head>
      <body>{children}</body>
    </html>
  );
}
