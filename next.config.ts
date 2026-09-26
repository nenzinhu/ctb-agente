import type { NextConfig } from 'next';
// @ts-ignore - next-pwa doesn't have type definitions
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  // lib/ingestion/parser.ts reads pdfjs's CMaps and standard font data from
  // node_modules at runtime. Nothing imports those files, so file tracing
  // wouldn't ship them to the Vercel function on its own.
  outputFileTracingIncludes: {
    '/api/ingestion/upload': [
      './node_modules/pdfjs-dist/cmaps/**/*',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
    ],
    // lib/ingestion/acervo.ts reads the bundled documents from disk.
    '/api/admin/acervo': ['./data/acervo/**/*'],
    // lib/mbft/fichas.ts reads the MBFT sheets built from the official manual.
    '/api/consulta': ['./data/acervo/mbft-fichas.json'],
    // lib/pop/pops.ts reads the POP manual built from the compiled PDF.
    '/api/pop/consulta': ['./data/acervo/pop-pmsc.json'],
    '/api/explicar': ['./data/acervo/mbft-fichas.json', './data/acervo/pop-pmsc.json'],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
