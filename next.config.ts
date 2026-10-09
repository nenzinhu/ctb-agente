import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Development uses Turbopack; production uses webpack because Serwist's
  // InjectManifest integration runs as a webpack plugin.
  turbopack: {},
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
    '/api/fatos-pmsc': ['./data/acervo/fatos-pmsc-mobile.json'],
    '/api/explicar': ['./data/acervo/mbft-fichas.json', './data/acervo/pop-pmsc.json'],
    '/api/apostila': ['./data/acervo/mbft-fichas.json', './data/acervo/pop-pmsc.json'],
    '/api/professor': ['./data/acervo/mbft-fichas.json'],
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  register: true,
  cacheOnNavigation: false,
  additionalPrecacheEntries: [{ url: '/offline', revision: '1' }],
  globPublicPatterns: ['icons/**/*', 'manifest.json', 'favicon.ico', 'brasao-cpmrv.*'],
});

export default withSerwist(nextConfig);
