import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'AR Fashion Try-On | Virtual Fitting Room with AI',
    template: '%s | AR Fashion Try-On',
  },
  description:
    'Experience AI-powered virtual try-on technology. Upload your photo and garments to see how clothes look on you instantly. Advanced ML-driven fashion visualization with real-time AR preview.',
  keywords: [
    'virtual try-on',
    'AR fashion',
    'virtual fitting room',
    'AI fashion',
    'garment visualization',
    'online fitting',
    'fashion tech',
    'ML fashion',
    'virtual wardrobe',
    'try before you buy',
    'fashion AI',
    'outfit preview',
  ],
  authors: [{ name: 'AR Fashion Try-On Team' }],
  creator: 'AR Fashion Try-On',
  publisher: 'AR Fashion Try-On',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://ar-fashion-tryon.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AR Fashion Try-On | Virtual Fitting Room with AI',
    description:
      'Experience AI-powered virtual try-on technology. See how clothes look on you instantly with our advanced ML-driven fashion visualization.',
    url: '/',
    siteName: 'AR Fashion Try-On',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AR Fashion Try-On - Virtual Fitting Room',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AR Fashion Try-On | Virtual Fitting Room with AI',
    description:
      'Experience AI-powered virtual try-on technology. See how clothes look on you instantly.',
    images: ['/og-image.png'],
    creator: '@arfashiontryon',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/favicon/site.webmanifest',
  applicationName: 'AR Fashion Try-On',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AR Fashion Try-On',
  },
  verification: {
    // Add your verification tokens here when ready
    // google: 'your-google-site-verification',
    // yandex: 'your-yandex-verification',
    // bing: 'your-bing-verification',
  },
  category: 'technology',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Structured Data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AR Fashion Try-On',
    description:
      'AI-powered virtual try-on technology for fashion. Upload your photo and garments to visualize how clothes look on you.',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://ar-fashion-tryon.vercel.app',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Virtual Try-On',
      'AI Garment Detection',
      'Real-time AR Preview',
      'Multiple Garment Types',
      'Outfit Construction',
    ],
    screenshot: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ar-fashion-tryon.vercel.app'}/og-image.png`,
  };

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
