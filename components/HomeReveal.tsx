'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

interface HomeRevealProps {
  children: ReactNode;
}

export default function HomeReveal({ children }: HomeRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-home-reveal]', {
          autoAlpha: 0,
          y: 12,
          duration: 0.45,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        });
      });
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return <div ref={root} className="contents">{children}</div>;
}
