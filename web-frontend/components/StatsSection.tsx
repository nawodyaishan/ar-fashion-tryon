'use client';

import { motion } from 'framer-motion';
import { useScrollReveal } from '@/lib/hooks/useScrollReveal';
import { Image, Zap, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const stats: Stat[] = [
  {
    value: 1000,
    suffix: '+',
    label: 'Try-Ons Processed',
    icon: Image,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    value: 98,
    suffix: '%',
    label: 'Accuracy Rate',
    icon: Zap,
    color: 'from-amber-500 to-orange-500',
  },
  {
    value: 100,
    suffix: '%',
    label: 'Privacy Protected',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
  },
];

function CountUp({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal();

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}</span>;
}

export function StatsSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.05),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94] as const,
                }}
                className="text-center group"
              >
                <div className="mb-4 inline-flex items-center justify-center">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-0.5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    <CountUp end={stat.value} />
                    {stat.suffix}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
