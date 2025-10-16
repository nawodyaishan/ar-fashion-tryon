'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HeroSplit() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image:
        'https://res.cloudinary.com/ddjp9nox3/image/upload/v1760049771/hero_live_ar_preview_dark_gradient_ahvy8h.png',
      alt: 'AR Preview Live',
      badge: 'Fast',
      badgeClass: 'bg-violet-500/20 border-violet-500/40 text-white',
    },
    {
      image:
        'https://res.cloudinary.com/ddjp9nox3/image/upload/v1760049770/card_live_ar_preview_dark_gradient_txfpza.png',
      alt: 'Photo Try-On HD',
      badge: 'HD',
      badgeClass: 'bg-purple-500/20 border-purple-500/40 text-white',
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Desktop: Side-by-side split */}
      <div className="hidden md:grid md:grid-cols-2 min-h-[600px] lg:min-h-[700px] w-full">
        {/* Left: AR Preview (Live) */}
        <div className="relative group overflow-hidden">
          <div className="relative w-full h-full">
            {/* Soft vignette */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30 z-10" />
            <Image
              src="https://res.cloudinary.com/ddjp9nox3/image/upload/v1760049770/card_live_ar_preview_dark_gradient_txfpza.png"
              alt="AR Preview Live"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            {/* Badge */}
            <Badge
              variant="outline"
              className="absolute top-6 right-6 z-20 bg-violet-500/20 border-violet-500/40 text-white backdrop-blur-sm"
            >
              Fast
            </Badge>
          </div>
        </div>

        {/* Right: Photo Try-On (HD) */}
        <div className="relative group overflow-hidden">
          <div className="relative w-full h-full">
            {/* Soft vignette */}
            <div className="absolute inset-0 bg-gradient-to-bl from-black/20 via-transparent to-black/30 z-10" />
            <Image
              src="https://res.cloudinary.com/ddjp9nox3/image/upload/v1760049771/hero_live_ar_preview_dark_gradient_ahvy8h.png"
              alt="Photo Try-On HD"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            {/* Badge */}
            <Badge
              variant="outline"
              className="absolute top-6 right-6 z-20 bg-purple-500/20 border-purple-500/40 text-white backdrop-blur-sm"
            >
              HD
            </Badge>
          </div>
        </div>

        {/* Centered content overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-8 bg-gradient-to-b from-transparent via-black/30 to-transparent">
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            See it live. See it real.
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-2xl mb-8 drop-shadow-md">
            Preview outfits instantly with AR, or generate photoreal results with AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="min-w-[180px]">
              <Link href="/try-on?mode=ar">Start AR Preview</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="min-w-[180px] text-white border-white/30 hover:bg-white/10"
            >
              <Link href="/try-on?mode=photo">Open HD Mode</Link>
            </Button>
          </div>
        </div>

        {/* Caption */}
        <p className="absolute bottom-6 right-6 z-20 text-xs text-white/70 drop-shadow-md">
          Beta: HD mode may use server processing.
        </p>
      </div>

      {/* Mobile: Swipe pager */}
      <div className="md:hidden relative">
        <div className="relative h-[600px] sm:h-[650px] overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-transform duration-500 ease-out ${
                index === currentSlide
                  ? 'translate-x-0'
                  : index < currentSlide
                    ? '-translate-x-full'
                    : 'translate-x-full'
              }`}
            >
              <div className="relative w-full h-full">
                {/* Soft vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40 z-10" />
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 0px"
                  className="object-cover"
                  priority={index === 0}
                />
                {/* Badge */}
                <Badge
                  variant="outline"
                  className={`absolute top-6 right-6 z-20 ${slide.badgeClass} backdrop-blur-sm`}
                >
                  {slide.badge}
                </Badge>
              </div>
            </div>
          ))}

          {/* Content overlay */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 drop-shadow-lg">
              See it live. See it real.
            </h1>
            <p className="text-base sm:text-lg text-white/90 max-w-md mb-6 drop-shadow-md">
              Preview outfits instantly with AR, or generate photoreal results with AI.
            </p>
            <div className="flex flex-col w-full gap-3 px-4">
              <Button size="lg" asChild className="w-full">
                <Link href="/try-on?mode=ar">Start AR Preview</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="w-full text-white border-white/30 hover:bg-white/10"
              >
                <Link href="/try-on?mode=photo">Open HD Mode</Link>
              </Button>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Pager dots */}
          <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Caption */}
          <p className="absolute bottom-16 left-0 right-0 z-20 text-xs text-white/70 text-center drop-shadow-md px-4">
            Beta: HD mode may use server processing.
          </p>
        </div>
      </div>
    </section>
  );
}
