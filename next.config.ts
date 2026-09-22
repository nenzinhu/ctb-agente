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
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
