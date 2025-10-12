import {
  Camera,
  Clock,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  Lock,
  Palette,
  Smartphone,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Feature, Highlight, NavigationItem } from './types';

// Brand Identity
export const brand = {
  name: 'AR Fashion',
  subtitle: 'Try-On Studio',
  fullName: 'AR Fashion Try-On Studio',
  tagline: 'See clothes on you, live or photoreal.',
  positioning:
    'A hybrid try-on experience that pairs a live AR preview for speed with an AI photo mode for photoreal results. Built with MediaPipe, Stable Diffusion, and a privacy-first pipeline.',
  beta: 'Beta: HD mode may use our server for processing.',
};

// Modes (primary features)
export const modes = [
  {
    id: 'ar-live',
    icon: Camera,
    title: 'AR Preview (Live)',
    description:
      'Instant webcam overlay that snaps to your shoulders. Great for quick sizing and vibe checks.',
    features: ['Live on device', 'Pose tracking', 'Screenshot'],
    href: '/try-on?mode=ar',
    badge: 'Fast',
    gradient: 'from-violet-500 to-blue-600',
  },
  {
    id: 'photo-hd',
    icon: Sparkles,
    title: 'Photo Try-On (HD)',
    description:
      'Upload a body photo and a garment (or outfit). Our AI composes a photoreal result.',
    features: ['CatVTON', 'Background removal', 'Cloud save'],
    href: '/try-on?mode=photo',
    badge: 'HD',
    gradient: 'from-blue-500 to-purple-600',
  },
];

// How It Works (3 steps)
export const howItWorksSteps = [
  {
    step: 1,
    title: 'Pick a mode',
    description: 'Live AR or Photo HD.',
    icon: Zap,
  },
  {
    step: 2,
    title: 'Add your photo(s)',
    description: 'Or select a sample.',
    icon: ImageIcon,
  },
  {
    step: 3,
    title: 'Adjust & save',
    description: 'Generate and save your look.',
    icon: Palette,
  },
];

// Highlights (Why choose us)
export const highlights: Highlight[] = [
  {
    icon: Zap,
    label: 'Hybrid by design',
    description: 'Fast AR + photoreal AI.',
  },
  {
    icon: Lock,
    label: 'Privacy-first',
    description: 'AR runs locally; HD mode asks permission before upload.',
  },
  {
    icon: Smartphone,
    label: 'Mobile-ready',
    description: 'Works on phones, tablets, and desktop.',
  },
  {
    icon: FileText,
    label: 'Open & documented',
    description: 'Clear APIs and public source.',
  },
];

// System Stats (soft claims)
export const systemStats = [
  { label: 'Try-ons generated', value: 'Thousands', icon: TrendingUp },
  { label: 'AR latency', value: 'Sub-2s', suffix: 'on modern phones', icon: Clock },
  { label: 'Processing', value: 'GPU-accelerated', suffix: 'when available', icon: Sparkles },
];

// Roadmap
export const roadmapItems = [
  { label: 'Live AR', status: 'done' as const },
  { label: 'Upload & Gallery', status: 'done' as const },
  { label: 'Real-time optimization', status: 'in-progress' as const },
  { label: 'AI recommendations', status: 'planned' as const },
  { label: 'Social sharing', status: 'planned' as const },
];

// Navigation
export const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    href: '/',
    description: 'Welcome to AR Fashion Try-On',
    icon: Home,
  },
  {
    title: 'Try-On Studio',
    href: '/try-on',
    description: 'Virtual fitting with AR technology',
    icon: Camera,
    badge: 'New',
  },
  {
    title: 'Docs',
    href: '/docs',
    description: 'Documentation and guides',
    icon: FileText,
  },
  {
    title: 'About',
    href: '/about',
    description: 'Learn more about the project',
    icon: Info,
  },
];

// Microcopy Library
export const microcopy = {
  buttons: {
    startTryOn: 'Start Try-On',
    openLiveAR: 'Open Live AR',
    openPhotoHD: 'Open Photo HD',
    generate: 'Generate',
    download: 'Download',
    tryAgain: 'Try Again',
    useSample: 'Use Sample',
    learnMore: 'Learn More',
    capturePhoto: 'Capture',
    uploadNew: 'Upload New',
    removeGarment: 'Remove',
    autoAlign: 'Auto-align',
    takeScreenshot: 'Take Screenshot',
    regenerate: 'Regenerate',
    back: 'Back',
    next: 'Next',
  },
  toggles: {
    showLandmarks: 'Show Landmarks',
    autoAlign: 'Auto-align',
    useRearCamera: 'Use rear camera',
    lockAspect: 'Lock aspect ratio',
  },
  sliders: {
    scale: 'Scale',
    rotation: 'Rotation',
    opacity: 'Opacity',
    steps: 'Inference Steps',
    guidance: 'Guidance Scale',
    seed: 'Seed',
  },
  status: {
    ready: 'Ready',
    warmingUp: 'Warming up model',
    processing: 'Processing…',
    done: 'Done',
    cameraActive: 'Camera Active',
    live: 'Live',
  },
  toasts: {
    savedToPhotos: 'Saved to Photos',
    copiedLink: 'Copied link',
    uploadComplete: 'Upload complete',
    captureSuccess: 'Photo captured',
    garmentSelected: 'Garment selected',
    settingsSaved: 'Settings saved',
  },
  emptyStates: {
    noImages: 'No images yet. Upload a body photo to begin.',
    noGarment: 'No garment selected. Pick from gallery or upload.',
    noResults: 'No results yet. Generate your first try-on.',
  },
  helpers: {
    bodyPhoto: 'Upload a clear, front-facing upper-body photo.',
    bodyPhotoBest: 'Plain background works best.',
    garmentPhoto: 'PNG with transparency preferred; JPG works too.',
    singleGarment: 'Try on one item (shirt, pants, or full dress)',
    upperLower: 'Upload separate top and bottom pieces',
    reference: 'Full-body person wearing clothes',
    arTip: 'Stand 3–4 ft away, shoulders visible, good lighting.',
    hdTip: '1024px+ width, plain background, PNG ideal.',
    processing: 'This may take up to a minute on shared GPUs.',
    poorResult: 'Poor result? Try a brighter body photo or a straighter garment shot.',
  },
  errors: {
    cameraDenied: 'We need camera access. Check your browser settings.',
    fileTooLarge: 'Max 10MB per image. Try a smaller file.',
    gpuBusy: 'The HD service is busy. Please retry in a moment.',
    apiError: 'Something went wrong on the server. Try again or pick a different image.',
    invalidFileType: 'Invalid file type. Please upload PNG, JPEG, or WEBP image.',
    noBodyPhoto: 'Body photo is required',
    noGarmentPhoto: 'Please upload a garment image',
    outfitNotConstructed: 'Outfit not constructed',
    classificationFailed: 'Garment classification failed',
  },
};

// Help Content (tutorials)
export const helpContent = {
  liveAR: {
    title: 'Live AR',
    gettingStarted: {
      title: 'Getting Started',
      steps: [
        'Allow camera access.',
        'Stand 3–4 ft away, shoulders visible.',
        'Pick a garment (gallery or upload).',
        'Tap Auto-align, then fine-tune with scale/rotate.',
        'Take Screenshot to save.',
      ],
    },
    bestPractices: {
      title: 'Best Practices',
      tips: [
        'Lighting in front of you; avoid backlight.',
        'Keep your torso centered; relax your arms.',
        'Use a plain background for clarity.',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting',
      items: [
        { issue: 'Camera blocked', solution: 'Enable in Settings → Privacy → Camera.' },
        { issue: 'Laggy', solution: 'Close other camera apps/tabs.' },
        { issue: 'Misaligned', solution: 'Re-tap Auto-align, then tweak manually.' },
      ],
    },
  },
  photoHD: {
    title: 'Photo HD',
    howItWorks: {
      title: 'How It Works',
      steps: [
        'Upload a clear body photo.',
        'Add a garment/outfit or choose Reference mode.',
        'Generate and review.',
      ],
    },
    bestResults: {
      title: 'Best Results',
      tips: [
        'High-res images (≥1024px width).',
        'Arms slightly away from body.',
        'Front-view garments on plain backgrounds.',
        'PNG with transparency ideal.',
      ],
    },
    troubleshooting: {
      title: 'Troubleshooting',
      items: [
        { issue: 'Upload failed', solution: 'Max 10MB; JPG/PNG only.' },
        { issue: 'Slow', solution: 'Shared GPUs can queue; retry later.' },
        {
          issue: 'Blurry result',
          solution: 'Try better lighting, adjust steps, or a different garment angle.',
        },
        { issue: 'API error', solution: 'Service may be warming up; try again.' },
      ],
    },
  },
};

// About Content
export const aboutContent = {
  lead: {
    title: 'About AR Fashion Try-On',
    intro:
      'We are building a practical bridge between quick AR previews and photoreal AI try-ons. Our hybrid approach keeps the demo smooth while delivering quality when it matters.',
  },
  mission: 'Make remote shopping feel confident and fun-without extra hardware or complex setup.',
  principles: [
    {
      title: 'Hybrid where it helps',
      description: 'Live when speed matters; AI when realism matters.',
      icon: Zap,
    },
    {
      title: 'Privacy over everything',
      description: 'Keep AR local; be explicit when uploads happen.',
      icon: Lock,
    },
    {
      title: 'Open by default',
      description: 'We document, we credit, we share.',
      icon: FileText,
    },
  ],
  technology: {
    title: 'Technology',
    intro: 'Built with modern computer vision and AI:',
    stack: [
      { name: 'MediaPipe', purpose: 'for pose tracking in AR.' },
      { name: 'U²-Net (rembg)', purpose: 'for garment cutouts.' },
      { name: 'CatVTON + Stable Diffusion', purpose: 'for photoreal try-on.' },
      { name: 'Cloudinary', purpose: 'for asset delivery.' },
    ],
  },
  responsibleUse: {
    title: 'Responsible Use',
    note: 'Results are synthetic previews, not product photos. Colors/fit may vary.',
  },
  credits: {
    title: 'Credits & Links',
    note: 'Built for research & demos.',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Source Code', href: 'https://github.com/nawodyaishan/ar-fashion-tryon' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Contact', href: '/contact' },
    ],
  },
};

// Settings & Privacy Content
export const privacyContent = {
  title: 'Privacy',
  description:
    'Live AR runs fully on your device. Photo HD may upload your selected images to our server for processing. We delete temporary files after processing. Do not upload sensitive images.',
  data: {
    title: 'Data',
    description:
      'We store minimal logs (timings, status) to improve stability. No face templates are stored.',
  },
  controls: [
    { label: 'Delete my recent uploads', action: 'deleteUploads', variant: 'destructive' as const },
    { label: 'Clear local cache', action: 'clearCache', variant: 'outline' as const },
    {
      label: 'Send diagnostics (opt-in)',
      action: 'toggleDiagnostics',
      variant: 'outline' as const,
    },
  ],
};

// Legacy features (kept for compatibility, can be removed later)
export const features: Feature[] = [
  {
    icon: Camera,
    title: 'AR Try-On',
    description: 'Experience virtual fashion fitting with cutting-edge AR technology',
    href: '/try-on',
    variant: 'default',
    badge: 'Featured',
    stats: 'Real-time',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    icon: Info,
    title: 'About Project',
    description: 'Learn about the technology and vision behind AR Fashion Try-On',
    href: '/about',
    variant: 'outline',
    stats: 'Open Source',
    gradient: 'from-green-500 to-emerald-600',
  },
];

export const performanceOptions = [
  { value: 'high', label: 'High Quality', description: 'Best visual quality, higher CPU usage' },
  { value: 'balanced', label: 'Balanced', description: 'Good quality with optimal performance' },
  { value: 'performance', label: 'Performance', description: 'Prioritize speed over quality' },
];

export const languageOptions = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
];
