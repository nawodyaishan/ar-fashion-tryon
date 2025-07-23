'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight } from 'lucide-react';

export function HeroCTA() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
      <Link href="/try-on">
        <Button size="lg" className="h-14 px-8 text-lg group">
          <Camera className="w-5 h-5 mr-2" />
          Start Try-On
          <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
      <Link href="/about">
        <Button variant="outline" size="lg" className="h-14 px-8 text-lg">
          Learn More
        </Button>
      </Link>
    </div>
  );
}
