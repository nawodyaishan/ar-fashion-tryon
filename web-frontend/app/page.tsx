'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroSplit } from '@/components/HeroSplit';
import { Roadmap } from '@/components/Roadmap';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import { PageTransition } from '@/components/ui/page-transition';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { SectionDivider } from '@/components/ui/section-divider';
import { StatsSection } from '@/components/StatsSection';
import { FinalCTA } from '@/components/FinalCTA';
import { useMount } from '@/lib/hooks/useMount';
import { ArrowRight, Camera, FileText, Lock, Smartphone, Sparkles, Zap } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

export default function Home() {
  const mounted = useMount();

  if (!mounted) return null;

  return (
    <PageTransition>
      <div className="min-h-screen">
      {/* Hero Section */}
      <div data-hero>
        <HeroSplit />
      </div>

      {/* Stats Section */}
      <StatsSection />

      <SectionDivider className="my-8" />

      {/* Main Content Container */}
      <div className="max-w-[1160px] mx-auto px-4">
        {/* Choose Your Mode */}
        <ScrollReveal>
          <section className="py-32">
          <div className="text-center mb-20">
            <Badge variant="secondary" className="mb-4">
              Dual Mode System
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Choose Your Mode</h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              Fast AR preview or photoreal AI results - you pick the experience that fits your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Card 1 — AR Preview (Live) */}
            <Card
              variant="elevated"
              interactive
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="p-8 relative">
                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-6 right-6 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 px-3 py-1"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Fast
                </Badge>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Camera className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-3">AR Preview (Live)</h3>

                {/* Body */}
                <p className="text-muted-foreground mb-8 leading-relaxed text-base">
                  Instant camera overlay that snaps to your shoulders. Perfect for quick sizing and
                  style checks.
                </p>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    On-device
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    Pose tracking
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    Screenshot
                  </Badge>
                </div>

                {/* CTA */}
                <Button asChild className="w-full" size="lg">
                  <Link href="/try-on?mode=ar">
                    Open Live AR
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Card 2 — Photo Try-On (HD) */}
            <Card
              variant="elevated"
              interactive
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="p-8 relative">
                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-6 right-6 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 px-3 py-1"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  HD
                </Badge>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-3">Photo Try-On (HD)</h3>

                {/* Body */}
                <p className="text-muted-foreground mb-8 leading-relaxed text-base">
                  Upload a body photo and a garment (or outfit). Our AI composes a photoreal result.
                </p>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    CatVTON AI
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    Auto removal
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    HD quality
                  </Badge>
                </div>

                {/* CTA */}
                <Button asChild className="w-full" size="lg">
                  <Link href="/try-on?mode=photo">
                    Open Photo HD
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
        </ScrollReveal>

        <SectionDivider className="my-16" />

        {/* How It Works */}
        <ScrollReveal>
          <section className="py-32">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">
              Simple 3-Step Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get started in seconds with our intuitive workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4 group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/10">
                <Zap className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">Step 1</Badge>
                <h3 className="text-xl font-bold">Pick a mode</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Live AR for instant previews, Photo HD for photoreal AI-generated results.
                </p>
              </div>
            </div>

            <div className="text-center space-y-4 group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 text-accent mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-accent/10">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">Step 2</Badge>
                <h3 className="text-xl font-bold">Add your images</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Use clean backgrounds and good lighting for the best results.
                </p>
              </div>
            </div>

            <div className="text-center space-y-4 group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-success/20 to-success/10 text-success mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-success/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">Step 3</Badge>
                <h3 className="text-xl font-bold">Adjust & save</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fine-tune scale and rotation, then download your perfect fit.
                </p>
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>

        <SectionDivider className="my-16" />

        {/* Highlights */}
        <ScrollReveal>
          <section className="py-32">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for Everyone</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features that put you in control
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="elevated" className="text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/10">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">Hybrid by design</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fast AR preview and photoreal AI - best of both worlds.
                </p>
              </div>
            </Card>

            <Card variant="elevated" className="text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/10 text-success mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-success/10">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">Privacy-first</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AR runs locally; HD asks before upload. Your data, your choice.
                </p>
              </div>
            </Card>

            <Card variant="elevated" className="text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-accent/10">
                  <Smartphone className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">Mobile-ready</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Works seamlessly on phones, tablets, and desktop.
                </p>
              </div>
            </Card>

            <Card variant="elevated" className="text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 text-warning mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-warning/10">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">Open & documented</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Clear APIs, public source, and comprehensive docs.
                </p>
              </div>
            </Card>
          </div>
        </section>
        </ScrollReveal>

        <SectionDivider className="my-16" />

        {/* Roadmap */}
        <ScrollReveal>
          <section className="py-32">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">
              Coming Soon
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Roadmap</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Exciting features we&apos;re building for you
            </p>
          </div>

          <Roadmap />
        </section>
        </ScrollReveal>
      </div>

      <SectionDivider className="my-16" />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <footer className="border-t py-16 mt-32 bg-muted/30">
        <div className="max-w-[1160px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg">AR Fashion</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Made for research & demos</span>
                <span>·</span>
                <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                  {APP_VERSION}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link
                href="/about"
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Docs
              </Link>
              <Link
                href="https://github.com/yourusername/ar-fashion-tryon"
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Privacy
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyMobileCTA />
    </div>
    </PageTransition>
  );
}
