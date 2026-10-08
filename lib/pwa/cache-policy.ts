export type PwaCacheClass = 'network-only' | 'static' | 'public-navigation';

export interface PwaRequestInput {
  url: string;
  method: string;
  destination: string;
  mode: string;
}

export const PWA_CACHE_PREFIX = 'ctb-serwist-v1';

const PUBLIC_SHELL_ROUTES = new Set([
  '/',
  '/apostila',
  '/comprimir-pdf',
  '/consulta',
  '/enquadramento',
  '/fatos-pmsc',
  '/favoritos',
  '/gerador-pdf',
  '/offline',
  '/pop',
  '/professor',
]);

export function classifyPwaRequest(input: PwaRequestInput): PwaCacheClass {
  if (input.method.toUpperCase() !== 'GET') return 'network-only';

  let url: URL;
  let pathname: string;
  try {
    url = new URL(input.url);
    pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/');
  } catch {
    return 'network-only';
  }

  if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'network-only';
  }

  if (['script', 'style', 'image', 'font', 'worker'].includes(input.destination) || pathname.startsWith('/_next/static/')) {
    return 'static';
  }

  if (input.mode === 'navigate' && url.search === '' && PUBLIC_SHELL_ROUTES.has(pathname)) {
    return 'public-navigation';
  }
  return 'network-only';
}
