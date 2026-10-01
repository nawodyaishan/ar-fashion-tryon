'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PageLoader } from './ui/page-loader';

const LOADER_MAX_MS = 8_000;

export function NavigationLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show loader on mount for initial page load
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Route changed, hide loader
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept same-tab internal link clicks to show loader
    const handleLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link || !link.href) return;

      // Links that open elsewhere never change this page, so the loader would never clear
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      const url = new URL(link.href);
      const currentUrl = new URL(window.location.href);
      if (url.origin !== currentUrl.origin) return;

      // Only show loader for different pages
      if (url.pathname !== currentUrl.pathname) {
        setIsLoading(true);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  useEffect(() => {
    // Safety net: never let the loader run indefinitely if navigation stalls or is cancelled
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), LOADER_MAX_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // Back/forward cache restores the page with the loader still showing
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setIsLoading(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return <PageLoader isLoading={isLoading} />;
}
