'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroSplit } from '@/components/HeroSplit';
import { Roadmap } from '@/components/Roadmap';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import { useMount } from '@/lib/hooks/useMount';
import {
  Camera,
  Sparkles,
  Zap,
  Lock,
  Smartphone,
  FileText,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const mounted = useMount();

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div data-hero>
        <HeroSplit />
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1160px] mx-auto px-4">
        {/* Choose Your Mode */}
        <section className="py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Choose Your Mode</h2>
            <p className="text-muted-foreground text-lg">
              Fast AR preview or photoreal AI results — you pick.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1 — AR Preview (Live) */}
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-200 group rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/6 to-blue-500/6 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <CardContent className="p-6 relative">
                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-6 right-6 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"
                >
                  Fast
                </Badge>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-semibold mb-3">AR Preview (Live)</h3>

                {/* Body */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Instant camera overlay that snaps to your shoulders. Great for quick sizing and vibe checks.
                </p>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    On-device
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    Pose tracking
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    Screenshot
                  </span>
                </div>

                {/* CTA */}
                <Button asChild className="w-full">
                  <Link href="/try-on?mode=ar">
                    Open Live AR
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 2 — Photo Try-On (HD) */}
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-200 group rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 to-purple-500/6 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <CardContent className="p-6 relative">
                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-6 right-6 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                >
                  HD
                </Badge>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-semibold mb-3">Photo Try-On (HD)</h3>

                {/* Body */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Upload a body photo and a garment (or outfit). Our AI composes a photoreal result.
                </p>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    CatVTON
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    Background removal
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    Cloud save
                  </span>
                </div>

                {/* CTA */}
                <Button asChild className="w-full">
                  <Link href="/try-on?mode=photo">
                    Open Photo HD
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 border-t">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
                <Zap className="w-6 h-6" />
              </div>
              <p className="text-sm leading-relaxed">
                <strong>Pick a mode</strong> — Live AR for speed, Photo HD for realism.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm leading-relaxed">
                <strong>Add your image(s)</strong> — Use a plain background and clear lighting.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm leading-relaxed">
                <strong>Adjust & save</strong> — Fine-tune scale/rotation, then download.
              </p>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-24 border-t">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Why Choose Us</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center border-2 rounded-2xl">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Hybrid by design</h3>
                <p className="text-sm text-muted-foreground">Fast AR + photoreal AI.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 rounded-2xl">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Privacy-first</h3>
                <p className="text-sm text-muted-foreground">AR runs locally; HD asks before upload.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 rounded-2xl">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Mobile-ready</h3>
                <p className="text-sm text-muted-foreground">Works on phones, tablets, and desktop.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 rounded-2xl">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Open & documented</h3>
                <p className="text-sm text-muted-foreground">Clear APIs and public source.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-24 border-t">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Roadmap</h2>
          </div>

          <Roadmap />
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t py-12 mt-24">
        <div className="max-w-[1160px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground">Made for research & demos.</p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                href="https://github.com/yourusername/ar-fashion-tryon"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyMobileCTA />
    </div>
  );
}
