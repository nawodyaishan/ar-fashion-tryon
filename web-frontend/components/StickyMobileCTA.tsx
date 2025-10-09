'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after 120px scroll
      const scrollPosition = window.scrollY;
      const heroElement = document.querySelector('[data-hero]');
      const heroBottom = heroElement?.getBoundingClientRect().bottom ?? 0;

      // Show when scrolled past 120px and hero is out of view
      setIsVisible(scrollPosition > 120 && heroBottom < 0);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <Button asChild className="w-full">
              <Link href="/try-on?mode=ar">Start AR</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/try-on?mode=photo">Open HD</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
