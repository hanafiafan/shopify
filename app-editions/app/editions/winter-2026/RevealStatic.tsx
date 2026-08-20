'use client';
import { useEffect } from 'react';

// ponytail: the injected SSR body hides most content with opacity-0 / inline opacity:0,
// expecting Shopify's stripped scroll-reveal JS to fade it in. With no JS the page is blank,
// so we force everything visible on mount and make lazy images eager.
// Ceiling: Theatre.js hero choreography + carousels won't animate; content is shown static.
export default function RevealStatic() {
  useEffect(() => {
    const root = document.querySelector('[data-injected-edition]');
    if (!root) return;
    root.querySelectorAll('.opacity-0').forEach((el) => el.classList.remove('opacity-0'));
    root.querySelectorAll<HTMLElement>('[style*="opacity:0"], [style*="opacity: 0"]').forEach((el) => {
      el.style.opacity = '1';
    });
    root.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute('loading', 'eager'));
  }, []);
  return null;
}
