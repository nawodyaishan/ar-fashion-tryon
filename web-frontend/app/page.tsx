'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  Sparkles, 
  Camera, 
  Image as ImageIcon, 
  Info,
  Zap,
  Users,
  Palette,
  Shield,
  Smartphone,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect } from 'react';

const features = [
  {
    icon: Camera,
    title: 'AR Try-On',
    description: 'Experience virtual fashion fitting with cutting-edge AR technology',
    href: '/try-on',
    variant: 'default' as const,
    badge: 'Featured',
    stats: '98% accuracy',
    gradient: 'from-blue-500 to-purple-600'
  },
  {
    icon: ImageIcon,
    title: 'Fashion Gallery',
    description: 'Browse our curated collection of trending outfits and styles',
    href: '/gallery',
    variant: 'secondary' as const,
    badge: 'Coming Soon',
    stats: '500+ items',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    icon: Info,
    title: 'About Project',
    description: 'Learn about the technology and vision behind AR Fashion Try-On',
    href: '/about',
    variant: 'outline' as const,
    stats: 'Open Source',
    gradient: 'from-green-500 to-emerald-600'
  }
];

const highlights = [
  { icon: Zap, label: 'Lightning Fast', description: 'Real-time processing' },
  { icon: Users, label: '10K+ Users', description: 'Growing community' },
  { icon: Palette, label: 'Smart Styling', description: 'AI-powered recommendations' },
  { icon: Shield, label: 'Privacy First', description: 'Your data stays secure' }
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = feature.icon;

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 ${
        feature.variant === 'default' ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10' :
        feature.variant === 'secondary' ? 'border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10' :
        'border-border/50 hover:border-primary/30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        animationDelay: `${index * 150}ms`,
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
           style={{ background: `linear-gradient(to bottom right, var(--primary) 0%, var(--primary) 100%)`, opacity: 0.03 }} />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {feature.stats}
              </p>
            </div>
          </div>
          {feature.badge && (
            <Badge 
              variant={feature.badge === 'Featured' ? 'default' : 'secondary'}
              className={`transition-all duration-300 ${
                feature.badge === 'Featured' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/25' 
                  : ''
              }`}
            >
              {feature.badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
        
        <div className="flex items-center justify-between">
          <Link href={feature.href}>
            <Button 
              variant={feature.variant}
              className={`group/btn transition-all duration-300 ${
                isHovered ? 'translate-x-1' : ''
              }`}
            >
              {feature.variant === 'default' ? 'Try Now' : 
               feature.variant === 'secondary' ? 'Explore' : 'Learn More'}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </Button>
          </Link>
          
          {feature.href === '/try-on' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
        </div>
      </CardContent>

      {/* Animated background decoration */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl" />
    </Card>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Hero Badge */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="px-6 py-2 text-sm bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Advanced AI & AR Technology
              </Badge>
            </div>

            {/* Hero Title */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AR Fashion
                </span>
                <br />
                <span className="text-foreground">
                  Try-On Studio
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Experience the future of online shopping with our revolutionary AR try-on technology. 
                See how clothes look on you before you buy.
              </p>
            </div>

            {/* CTA Buttons */}
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

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-2xl mx-auto">
              {highlights.map((item, index) => (
                <div 
                  key={item.label}
                  className="text-center space-y-2 opacity-0 animate-fadeInUp"
                  style={{ animationDelay: `${800 + index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Explore Our Features
            </h2>
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