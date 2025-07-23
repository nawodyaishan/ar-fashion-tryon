'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import type { Feature } from '@/lib/types';

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = feature.icon;

  const getButtonText = (variant: Feature['variant']) => {
    switch (variant) {
      case 'default':
        return 'Try Now';
      case 'secondary':
        return 'Explore';
      default:
        return 'Learn More';
    }
  };

  const getBadgeClassName = (badge?: string) => {
    if (badge === 'Featured') {
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/25';
    }
    return '';
  };

  const getCardClassName = (variant: Feature['variant']) => {
    const baseClass =
      'group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10';

    switch (variant) {
      case 'default':
        return `${baseClass} border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10`;
      case 'secondary':
        return `${baseClass} border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10`;
      default:
        return `${baseClass} border-border/50 hover:border-primary/30`;
    }
  };

  return (
    <Card
      className={getCardClassName(feature.variant)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 150}ms`,
        animation: 'fadeInUp 0.6s ease-out forwards',
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom right, var(--primary) 0%, var(--primary) 100%)`,
          opacity: 0.03,
        }}
      />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{feature.stats}</p>
            </div>
          </div>
          {feature.badge && (
            <Badge
              variant={feature.badge === 'Featured' ? 'default' : 'secondary'}
              className={`transition-all duration-300 ${getBadgeClassName(feature.badge)}`}
            >
              {feature.badge}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

        <div className="flex items-center justify-between">
          <Link href={feature.href}>
            <Button
              variant={feature.variant}
              className={`group/btn transition-all duration-300 ${
                isHovered ? 'translate-x-1' : ''
              }`}
            >
              {getButtonText(feature.variant)}
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

      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl" />
    </Card>
  );
}
