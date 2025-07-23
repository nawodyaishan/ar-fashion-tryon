'use client';

import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Smartphone, Zap } from 'lucide-react';
import { FeatureCard } from '@/components/FeatureCard';
import { HeroBadge } from '@/components/HeroBadge';
import { HeroTitle } from '@/components/HeroTitle';
import { HeroCTA } from '@/components/HeroCTA';
import { HighlightStats } from '@/components/HighlightStats';
import { features, highlights } from '@/lib/constants';
import { useMount } from '@/lib/hooks/useMount';

export default function Home() {
  const mounted = useMount();

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />

        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <HeroBadge />
            <HeroTitle />
            <HeroCTA />
            <HighlightStats highlights={highlights} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Explore Our Features</h2>
            <p className="text-lg text-muted-foreground">
              Discover everything our AR Fashion Try-On platform has to offer
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Beta Notice */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Alert className="max-w-4xl mx-auto border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
            <AlertDescription className="text-base">
              <strong>Beta Version:</strong> We&apos;re continuously improving our AR technology.
              Your feedback helps us make the experience even better!{' '}
              <Link href="/about" className="text-primary hover:underline font-medium">
                Learn more about our roadmap →
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Mobile Optimization Notice */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Optimized for mobile and desktop</span>
            <div className="w-1 h-1 bg-muted-foreground rounded-full" />
            <Zap className="w-4 h-4" />
            <span>Powered by WebGL & MediaPipe</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
