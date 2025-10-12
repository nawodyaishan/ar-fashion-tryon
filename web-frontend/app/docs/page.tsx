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
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#getting-started">
              <Zap className="h-5 w-5 mr-2" />
              <span>Getting Started</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#features">
              <Camera className="h-5 w-5 mr-2" />
              <span>Features Guide</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="#technical">
              <Code className="h-5 w-5 mr-2" />
              <span>Technical Details</span>
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
          <Card className="border-2">
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
                    <li>✓ Instant feedback</li>
                    <li>✓ Runs locally (private)</li>
                    <li>✓ Perfect for quick checks</li>
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
                    <li>✓ Upload body + garment</li>
                    <li>✓ High-quality output</li>
                    <li>✓ Best for final decisions</li>
                  </ul>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/try-on?mode=photo">Try Photo HD</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Core Features</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Real-time pose tracking (MediaPipe)</li>
                      <li>• Draggable garment overlay</li>
                      <li>• Scale, rotate, opacity controls</li>
                      <li>• Auto-align to shoulders</li>
                      <li>• Screenshot capture</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Best Practices</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Stand 3-4 feet from camera</li>
                      <li>• Ensure good lighting</li>
                      <li>• Keep shoulders visible</li>
                      <li>• Use plain background</li>
                    </ul>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Modes Available</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• <strong>NORMAL:</strong> Single garment try-on</li>
                      <li>• <strong>FULL:</strong> Complete outfit (top + bottom)</li>
                      <li>• <strong>REFERENCE:</strong> Style transfer from photo</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">AI Features</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Auto garment classification</li>
                      <li>• Image quality validation</li>
                      <li>• Background removal (optional)</li>
                      <li>• Advanced ML parameters</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Technical Details */}
        <section id="technical" className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Technical Details</h2>

          <div className="space-y-6">
            {/* Architecture */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2">Frontend</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Next.js 15 with App Router</li>
                      <li>• React 19 + TypeScript</li>
                      <li>• Tailwind CSS v4</li>
                      <li>• Zustand for state management</li>
                      <li>• MediaPipe for pose detection</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2">Backend (ML Services)</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• FastAPI (Python)</li>
                      <li>• CatVTON model for try-on generation</li>
                      <li>• YOLO v8 for garment detection</li>
                      <li>• U²-Net for background removal</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2">Infrastructure</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Vercel (Frontend hosting)</li>
                      <li>• GPU-accelerated ML backend</li>
                      <li>• Docker containers</li>
                      <li>• PostgreSQL + Redis</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Reference */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>API Reference</CardTitle>
                <CardDescription>ML Backend endpoints for Photo HD mode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-500 font-semibold">POST</span>
                      <span className="text-muted-foreground">/process_images/</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Generate virtual try-on from body + garment images</p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-500 font-semibold">POST</span>
                      <span className="text-muted-foreground">/classify-garment</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-detect garment type (upper/lower/full)</p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 font-mono text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-500 font-semibold">POST</span>
                      <span className="text-muted-foreground">/construct-outfit</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Combine upper + lower garments into complete outfit</p>
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
