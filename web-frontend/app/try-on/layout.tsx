import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virtual Try-On',
  description:
    'Try on clothes virtually with AI. Choose between live AR preview or high-quality photo try-on. Upload your photo and garment to see instant results.',
  keywords: [
    'virtual try-on',
    'AR clothing',
    'photo try-on',
    'outfit preview',
    'virtual fitting',
    'AI fashion',
    'garment visualization',
    'try clothes online',
  ],
  openGraph: {
    title: 'Virtual Try-On | AR Fashion Try-On',
    description:
      'Try on clothes virtually with AI. Live AR preview and HD photo try-on available.',
    url: '/try-on',
    images: [
      {
        url: '/og-tryon.png',
        width: 1200,
        height: 630,
        alt: 'Virtual Try-On Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virtual Try-On | AR Fashion Try-On',
    description: 'Try on clothes virtually with AI. Live AR preview and HD photo try-on.',
    images: ['/og-tryon.png'],
  },
  alternates: {
    canonical: '/try-on',
  },
};

export default function TryOnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
