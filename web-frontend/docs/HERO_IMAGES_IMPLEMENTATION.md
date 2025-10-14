# Hero Images Implementation Guide

## 🎨 Branding Images Used

Located in `/public/hero/`:

- `hero_live_ar_preview_dark_gradient.png` (1.98 MB) - Main hero image for Photo HD mode
- `card_live_ar_preview_dark_gradient.png` (1.71 MB) - Card image for AR Preview mode
- `A_digital_illustration_showcases_a_side-by-side.png` (2.18 MB) - Alternative branding asset
- `A_digital_image_presents_a_side-by-side_comparison.png` (1.57 MB) - Alternative branding asset

## 🏠 Home Page Implementation

### 1. Hero Section - Split Screen Design (`components/HeroSplit.tsx`)

**Desktop Layout:**

- Side-by-side split (50/50)
- Left: AR Preview (Live) with violet gradient overlay
- Right: Photo Try-On (HD) with purple gradient overlay
- Each side has:
    - Badge (Fast / HD)
    - Heading ("See it live." / "See it real.")
    - Subline text
    - CTA button
    - Hover scale effect (1.05x)

**Mobile Layout:**

- Vertical scroll
- Full-width cards with 400px height
- Rounded corners (rounded-2xl)
- Gradient overlay (from-black/80 to transparent)
- Content anchored at bottom
- Full-width CTAs

**Key Features:**

- ✅ Next.js Image optimization with `priority` flag
- ✅ Responsive `fill` layout with `object-cover`
- ✅ Smooth hover transitions (700ms)
- ✅ Dark overlay for text readability
- ✅ Backdrop blur on badges

### 2. How It Works Section - Mode Visual Anchors

Added two thumbnail cards below the 3-step process:

- Left card: AR Preview mode with "Quick, local, instant preview"
- Right card: Photo HD mode with "AI-powered realistic try-on"
- Each card: 192px height (h-48)
- Gradient overlays for text readability
- Responsive sizing: `sizes="(max-width: 768px) 100vw, 50vw"`

## ⚙️ Next.js Image Optimization (`next.config.ts`)

```typescript
images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
        },
    ],
        formats
:
    ['image/avif', 'image/webp'],
        deviceSizes
:
    [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes
:
    [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL
:
    60,
}
```

**Benefits:**

- ✅ Automatic AVIF/WebP conversion
- ✅ Responsive image generation for all device sizes
- ✅ 60-second CDN cache
- ✅ Lazy loading (except hero with `priority`)
- ✅ Optimized bundle sizes

## 📱 Mobile-First Considerations

**Touch Targets:**

- All buttons: min 44px height (lg size)
- Full-width CTAs on mobile
- Adequate spacing (24px padding)

**Performance:**

- Hero images load first (`priority` flag)
- Mode thumbnails lazy load
- Optimized image formats (AVIF > WebP > PNG)
- Proper `sizes` attribute for responsive images

**Visual Hierarchy:**

- Hero images dominate viewport
- Clear text contrast with dark overlays
- Badge indicators for mode differentiation
- Smooth scroll experience

## 🎯 Design System Integration

**Colors:**

- AR Preview: Violet gradient (`from-violet-500/10`)
- Photo HD: Purple gradient (`from-blue-500/10`)
- Overlays: Black/80 to transparent
- Text: White on dark backgrounds

**Typography:**

- Headlines: 2xl-4xl font-bold
- Sublines: sm-base text-white/90
- Badges: xs with icon + text

**Spacing:**

- Section padding: py-16 md:py-20
- Card spacing: gap-6
- Content padding: p-4 to p-8

## 🚀 Performance Metrics

**Before Optimization:**

- No hero images
- Basic text hero
- ~122 KB First Load JS

**After Optimization:**

- Visual hero with branding images
- Optimized image delivery (AVIF/WebP)
- ~129 KB First Load JS (+7 KB, acceptable)
- Static pre-rendering maintained

**Image Optimization Results:**

- Original PNG: 1.7-2.2 MB each
- Next.js AVIF: ~200-300 KB (estimated 85% reduction)
- Responsive breakpoints: 8 device sizes
- Modern format support: AVIF + WebP fallback

## 🎨 Future Enhancements

**Try-On Studio Page:**

- [ ] Use AR Preview image as blurred background header in AR mode
- [ ] Add "FAST / ON-DEVICE" pill overlay
- [ ] Use Photo HD image as header banner in Photo mode
- [ ] Add AI diffusion dot animation as loading screen

**Help Modal:**

- [ ] Add mode thumbnails in tab headers
- [ ] Use images as visual anchors for each tutorial section

**About Page:**

- [ ] Add split-screen hero showing both modes
- [ ] Use thumbnail images in "How It Works" section

## 📊 Build Output

```
Route (app)                Size     First Load JS
┌ ○ /                      9.2 kB   129 kB
├ ○ /about                 6.58 kB  120 kB
├ ○ /settings              14.8 kB  145 kB
└ ○ /try-on                108 kB   238 kB
```

All pages build successfully with image optimization enabled.

## 🔧 Technical Notes

**Image Props Best Practices:**

```tsx
<Image
    src="/hero/image.png"
    alt="Descriptive text"
    fill                              // Responsive container-based sizing
    className="object-cover"          // Maintain aspect ratio
    priority                          // Above-the-fold images only
    sizes="(max-width: 768px) 100vw, 50vw"  // Responsive sizing hints
/>
```

**Gradient Overlay Pattern:**

```tsx
<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
```

**Hover Effects:**

```tsx
className = "transition-transform duration-700 group-hover:scale-105"
```

## ✅ Implementation Checklist

- [x] Added hero images to `/public/hero/`
- [x] Created `HeroSplit` component with desktop/mobile layouts
- [x] Integrated hero component into home page
- [x] Added mode thumbnails to "How It Works" section
- [x] Configured Next.js image optimization
- [x] Tested responsive layouts (mobile/desktop)
- [x] Verified build output and bundle sizes
- [x] Applied mobile-first design patterns
- [x] Implemented performance optimizations

## 📖 References

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Responsive Images](https://nextjs.org/docs/app/api-reference/components/image#sizes)
- [Image Formats](https://nextjs.org/docs/app/api-reference/components/image#formats)
