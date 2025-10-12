'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Camera,
  Sparkles,
  Code,
  Package,
  Zap,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Keyboard,
  Image as ImageIcon,
  Upload,
  Settings,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Documentation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to understand and use AR Fashion Try-On
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-3 mb-12">
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#getting-started">
              <Zap className="h-5 w-5 mr-2" />
              <span>Quick Start</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#features">
              <Camera className="h-5 w-5 mr-2" />
              <span>Features</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#api">
              <Code className="h-5 w-5 mr-2" />
              <span>API Reference</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#troubleshooting">
              <HelpCircle className="h-5 w-5 mr-2" />
              <span>Troubleshooting</span>
            </Link>
          </Button>
        </div>

        {/* Overview */}
        <section id="overview" className="mb-12">
          <Alert className="border-primary/50 bg-primary/5">
            <Info className="h-5 w-5" />
            <AlertDescription className="text-base">
              AR Fashion Try-On is a hybrid virtual try-on system combining real-time AR preview with AI-powered photoreal generation.
            </AlertDescription>
          </Alert>
        </section>

        {/* Getting Started */}
        <section id="getting-started" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Getting Started</h2>

          {/* Mode Comparison */}
          <Card className="border-2 mb-6">
            <CardHeader>
              <CardTitle>Choose Your Mode</CardTitle>
              <CardDescription>Two ways to try on garments, each optimized for different needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Live AR */}
                <div className="p-4 rounded-lg border-2 border-violet-500/20 bg-violet-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Camera className="h-6 w-6 text-violet-500" />
                    <h3 className="text-lg font-semibold">Live AR Preview</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li>✓ Real-time webcam overlay</li>
                    <li>✓ Instant feedback (sub-2s latency)</li>
                    <li>✓ Runs locally (100% private)</li>
                    <li>✓ Perfect for quick checks</li>
                    <li>✓ Keyboard shortcuts supported</li>
                  </ul>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/try-on?mode=ar">Try Live AR</Link>
                  </Button>
                </div>

                {/* Photo HD */}
                <div className="p-4 rounded-lg border-2 border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                    <h3 className="text-lg font-semibold">Photo HD</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li>✓ AI-powered photoreal results</li>
                    <li>✓ 3 modes: Single, Full Outfit, Reference</li>
                    <li>✓ Auto garment classification</li>
                    <li>✓ Quality validation &amp; tips</li>
                    <li>✓ Best for final decisions</li>
                  </ul>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/try-on?mode=photo">Try Photo HD</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Tutorials */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AR Tutorial */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="h-5 w-5 text-violet-500" />
                  Live AR Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Allow Camera Access</h4>
                      <p className="text-xs text-muted-foreground">Click &quot;Allow&quot; when your browser asks for camera permission</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Position Yourself</h4>
                      <p className="text-xs text-muted-foreground">Stand 3-4 feet from camera, shoulders visible, good lighting</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Select a Garment</h4>
                      <p className="text-xs text-muted-foreground">Choose from gallery or upload your own PNG/JPEG (max 5MB)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Adjust &amp; Align</h4>
                      <p className="text-xs text-muted-foreground">Use Auto-align button, then fine-tune with sliders or drag</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">5</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Take Screenshot</h4>
                      <p className="text-xs text-muted-foreground">Click camera icon to capture and download your try-on</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo HD Tutorial */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Photo HD Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Choose Try-On Mode</h4>
                      <p className="text-xs text-muted-foreground">NORMAL (single item), FULL (outfit), or REFERENCE (style transfer)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Upload Body Photo</h4>
                      <p className="text-xs text-muted-foreground">Front-facing, ≥1024px, good lighting. Quality tips provided</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Upload Garment(s)</h4>
                      <p className="text-xs text-muted-foreground">AI auto-detects garment type with confidence scores</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Review &amp; Adjust</h4>
                      <p className="text-xs text-muted-foreground">Check cloth type, quality warnings, advanced settings</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">5</div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Generate &amp; Download</h4>
                      <p className="text-xs text-muted-foreground">Process takes 20-60s. Download or regenerate result</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Guide */}
        <section id="features" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Features Guide</h2>

          <div className="space-y-6">
            {/* Live AR Features */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Live AR Mode
                </CardTitle>
                <CardDescription>Real-time webcam overlay with instant feedback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Core Features
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Real-time pose tracking</strong> using MediaPipe (33-point detection)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Draggable garment overlay</strong> with resize handles</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Transform controls:</strong> Scale (30-300%), Rotation (±45°), Opacity (10-100%)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Auto-align to shoulders</strong> for perfect positioning</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Screenshot capture</strong> with download</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Aspect ratio locking</strong> for proportional resizing</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Best Practices
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Distance:</strong> Stand 3-4 feet from camera for optimal tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Lighting:</strong> Front lighting (avoid backlight)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Pose:</strong> Keep shoulders visible, torso centered</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Background:</strong> Plain, uncluttered background works best</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Camera:</strong> 720p or higher recommended</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Keyboard className="h-4 w-4 text-primary" />
                    Keyboard Shortcuts
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded">↑ ↓ ← →</kbd>
                      <p className="text-xs text-muted-foreground mt-2">Move garment (1px, 10px with Shift)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded">+ / =</kbd>
                      <p className="text-xs text-muted-foreground mt-2">Increase scale (5%, 50% with Shift)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded">-</kbd>
                      <p className="text-xs text-muted-foreground mt-2">Decrease scale (5%, 50% with Shift)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo HD Features */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Photo HD Mode
                </CardTitle>
                <CardDescription>AI-powered photoreal virtual try-on with multiple modes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                      Try-On Modes
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-semibold text-sm mb-1">NORMAL</h5>
                        <p className="text-xs text-muted-foreground">Single garment try-on. Upload body photo + one garment (shirt, pants, or dress). AI detects garment type automatically.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-semibold text-sm mb-1">FULL</h5>
                        <p className="text-xs text-muted-foreground">Complete outfit construction. Upload body photo + upper garment + lower garment. System combines them into full outfit.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-semibold text-sm mb-1">REFERENCE</h5>
                        <p className="text-xs text-muted-foreground">Style transfer from reference photo. Upload your body + full-body photo of someone wearing desired outfit.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      AI Features
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Auto garment classification</strong> with confidence scores (YOLO v8)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Quality validation:</strong> Resolution, brightness, aspect ratio checks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Smart preselection:</strong> LOCKED (≥85%), SUGGESTED (60-84%), UNKNOWN (&lt;60%)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>WebP conversion:</strong> Auto-converts unsupported formats</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Background removal:</strong> Optional U²-Net segmentation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Advanced ML controls:</strong> Inference steps (20-100), guidance scale (1-10), seed</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Image Requirements */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Upload className="h-4 w-4 text-primary" />
                    Image Requirements
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <h5 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">Body Photos</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>✓ Front-facing, upper body visible</li>
                        <li>✓ Resolution ≥1024px (width or height)</li>
                        <li>✓ Good lighting (luma 50-230)</li>
                        <li>✓ Plain background preferred</li>
                        <li>✓ PNG, JPEG, or WebP (auto-converted)</li>
                        <li>✓ Max 10MB file size</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <h5 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">Garment Photos</h5>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>✓ Front view, flat or on hanger</li>
                        <li>✓ Resolution ≥1024px recommended</li>
                        <li>✓ Centered, clearly visible</li>
                        <li>✓ Plain background works best</li>
                        <li>✓ PNG with transparency ideal</li>
                        <li>✓ Single garment per image</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* API Reference */}
        <section id="api" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">API Reference</h2>

          <div className="space-y-6">
            {/* Architecture Overview */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  System Architecture
                </CardTitle>
                <CardDescription>Hybrid frontend + ML backend architecture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Code className="h-4 w-4 text-violet-500" />
                      Frontend
                    </h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li>• Next.js 15 (App Router)</li>
                      <li>• React 19 + TypeScript</li>
                      <li>• Tailwind CSS v4</li>
                      <li>• Zustand (state)</li>
                      <li>• MediaPipe (AR)</li>
                      <li>• Axios (HTTP client)</li>
                      <li>• react-rnd (draggable)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      ML Backend
                    </h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li>• FastAPI (Python)</li>
                      <li>• CatVTON (try-on)</li>
                      <li>• YOLO v8 (detection)</li>
                      <li>• U²-Net (segmentation)</li>
                      <li>• PyTorch</li>
                      <li>• OpenCV</li>
                      <li>• PIL/Pillow</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Infrastructure
                    </h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li>• Vercel (frontend)</li>
                      <li>• GPU backend</li>
                      <li>• Docker containers</li>
                      <li>• PostgreSQL</li>
                      <li>• Redis cache</li>
                      <li>• Cloudinary (CDN)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Endpoints */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>ML Backend Endpoints</CardTitle>
                <CardDescription>Photo HD mode REST API (base: http://127.0.0.1:8000 or production URL)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Endpoint 1: Process Images */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded">POST</span>
                      <code className="text-sm font-mono">/process_images/</code>
                    </div>
                    <span className="text-xs text-muted-foreground">60s timeout</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Generate virtual try-on result from body photo and garment image(s)</p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Request (multipart/form-data)</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs space-y-1">
                        <div><span className="text-blue-500">person_image</span>: File (PNG/JPEG, max 10MB)</div>
                        <div><span className="text-blue-500">cloth_image</span>: File (PNG/JPEG, max 10MB)</div>
                        <div><span className="text-blue-500">cloth_type</span>: &quot;upper&quot; | &quot;lower&quot; | &quot;overall&quot;</div>
                        <div><span className="text-blue-500">num_inference_steps</span>: number (20-100, default 50)</div>
                        <div><span className="text-blue-500">guidance_scale</span>: number (1.0-10.0, default 2.5)</div>
                        <div><span className="text-blue-500">seed</span>: number (-1 to 999, default 42)</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold mb-2">Response</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs">
                        <div className="text-green-500">200 OK: image/png (binary Blob)</div>
                        <div className="text-red-500 mt-1">400/500: JSON error object</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 2: Classify Garment */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded">POST</span>
                    <code className="text-sm font-mono">/classify-garment</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Detect garment type using YOLO v8 model with confidence score</p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Request (multipart/form-data)</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs">
                        <div><span className="text-blue-500">garment_image</span>: File (PNG/JPEG)</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold mb-2">Response (JSON)</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs">
                        <pre className="whitespace-pre-wrap">{`{
  "label": "T-Shirt",
  "confidence": 0.92,
  "detectedType": "upper"
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 3: Construct Outfit */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded">POST</span>
                    <code className="text-sm font-mono">/construct-outfit</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Combine upper and lower garment images into complete outfit for FULL mode</p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Request (multipart/form-data)</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs space-y-1">
                        <div><span className="text-blue-500">upper_image</span>: File (PNG/JPEG)</div>
                        <div><span className="text-blue-500">lower_image</span>: File (PNG/JPEG)</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold mb-2">Response (JSON)</h5>
                      <div className="p-3 rounded bg-background font-mono text-xs">
                        <pre className="whitespace-pre-wrap">{`{
  "outfit_url": "https://cdn.example.com/outfit.png",
  "upper_classification": { ... },
  "lower_classification": { ... }
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Troubleshooting</h2>

          <div className="space-y-6">
            {/* Common Issues */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Common Issues &amp; Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* AR Mode Issues */}
                  <div className="border-l-4 border-violet-500 pl-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-violet-500" />
                      Live AR Mode
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Camera access denied</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Check browser settings → Privacy & Security → Camera. Grant permission for this site. On mobile, check system Settings → Safari/Chrome → Camera.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Garment overlay misaligned or jumpy</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Click Auto-align button. Ensure good lighting and shoulders are visible. Stand 3-4 feet away. Adjust manually with sliders if needed.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Low FPS or laggy performance</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Close other camera apps/tabs. Try lower camera resolution. Update browser to latest version. Check CPU usage.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Custom garment upload fails</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Check file format (PNG/JPEG only). Max file size 5MB. Try compressing image. Ensure image is not corrupted.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photo HD Issues */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Photo HD Mode
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Generation takes too long (&gt;60s)</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Shared GPU may be busy. Wait and retry. Check if backend is warming up (first request after idle). Reduce inference steps to 30-40 for faster results.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Poor quality or blurry results</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Use higher resolution images (≥1024px). Ensure good lighting. Try plain background. Increase inference steps to 60-80. Adjust guidance scale to 3.0-4.0.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Upload fails or times out</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Check file size (max 10MB). Verify format (PNG/JPEG only - WebP auto-converted). Check internet connection. Compress images if needed.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">Garment classification is wrong</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Manually change cloth type in selector. Use clearer garment photos with plain background. Ensure garment is centered and fully visible.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-500 font-bold">✗</span>
                          <h5 className="font-semibold text-sm">API error or 500 server error</h5>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          <strong>Solution:</strong> Backend may be starting up (30-60s warm-up). Retry after a minute. Check backend status indicator. Try different image if persistent.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Tips */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Performance &amp; Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Speed Optimization
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Use <strong>Live AR</strong> for quick sizing checks (&lt;2s)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Lower inference steps (30-40) for faster Photo HD</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Compress images to ~2-3MB before upload</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Use PNG with transparency for garments</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      Quality Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Use <strong>Photo HD</strong> for final decisions (higher quality)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Higher resolution (1024px+) = better results</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Increase inference steps (60-80) for quality</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Plain backgrounds improve segmentation</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Additional Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle>Source Code</CardTitle>
                <CardDescription>View the full implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a
                    href="https://github.com/nawodyaishan/ar-fashion-tryon"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>GitHub Repository</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle>Get Help</CardTitle>
                <CardDescription>Questions or issues?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a
                    href="https://github.com/nawodyaishan/ar-fashion-tryon/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Report Issue</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <Card className="border-2 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
          <CardContent className="pt-8 pb-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-6">
              Try the virtual try-on system now
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" asChild>
                <Link href="/try-on?mode=ar">Live AR</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/try-on?mode=photo">Photo HD</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
