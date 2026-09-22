'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  theme?: 'light' | 'dark' | 'auto';
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile anti-bot widget.
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured, so the
 * app keeps working in local development.
 */
export default function TurnstileWidget({ onToken, theme = 'auto' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token: string) => onToken(token),
      'error-callback': () => onToken(null),
      'expired-callback': () => onToken(null),
    });
  }, [onToken, theme]);

  useEffect(() => {
    if (scriptReady) {
      renderWidget();
    }
  }, [scriptReady, renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="mb-2" aria-label="Verificação anti-bot" />
      <noscript>
        <p className="text-sm text-red-700">
          A verificação anti-bot requer JavaScript. Ative o JavaScript para consultar.
        </p>
      </noscript>
    </>
  );
}

export const turnstileConfigurado = Boolean(SITE_KEY);
