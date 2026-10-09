/// <reference lib="webworker" />

import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
} from 'serwist';
import { classifyPwaRequest, PWA_CACHE_PREFIX } from '../lib/pwa/cache-policy';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const matcher = (classe: ReturnType<typeof classifyPwaRequest>) =>
  ({ request, url }: { request: Request; url: URL }) =>
    classifyPwaRequest({
      url: url.href,
      method: request.method,
      destination: request.destination,
      mode: request.mode,
    }) === classe;

export const runtimeCaching: RuntimeCaching[] = [
  { matcher: matcher('network-only'), handler: new NetworkOnly() },
  {
    matcher: matcher('static'),
    handler: new CacheFirst({
      cacheName: `${PWA_CACHE_PREFIX}-static`,
      plugins: [new ExpirationPlugin({ maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: matcher('public-navigation'),
    handler: new NetworkFirst({
      cacheName: `${PWA_CACHE_PREFIX}-pages`,
      networkTimeoutSeconds: 8,
      plugins: [new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },
];

const serwist = new Serwist({
  cacheId: PWA_CACHE_PREFIX,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => !name.includes(PWA_CACHE_PREFIX) && /workbox|next-pwa|pages|static-(?:js|style|image)/i.test(name))
        .map((name) => caches.delete(name))
    ))
  );
});

serwist.addEventListeners();
