'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Lock, Eye, Trash2, Server } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy matters. Here&apos;s how we handle your data.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Quick Summary */}
        <Alert className="mb-8 border-primary/50 bg-primary/5">
          <Lock className="h-5 w-5" />
          <AlertDescription className="text-base">
            <strong>TL;DR:</strong> Live AR runs locally on your device. Photo HD uploads images to our server for processing only, then deletes them. We don&apos;t store your photos permanently.
          </AlertDescription>
        </Alert>

        {/* Data Collection */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Eye className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">What We Collect</CardTitle>
              </div>
              <CardDescription>We keep data collection to an absolute minimum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Live AR Mode</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Runs entirely on your device</li>
                    <li>• No images uploaded or stored</li>
                    <li>• Camera feed never leaves your browser</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Photo HD Mode</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Uploads body and garment photos for AI processing</li>
                    <li>• Temporary storage during generation (30-60 seconds)</li>
                    <li>• Automatically deleted after processing</li>
                    <li>• No permanent storage of your photos</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Technical Logs</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Processing times and status (for performance monitoring)</li>
                    <li>• Error logs (no personal data included)</li>
                    <li>• No face templates or biometric data stored</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How We Use Data */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Server className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">How We Use Your Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Process your try-on requests using AI models</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Monitor system performance and stability</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <span>We <strong>never</strong> sell or share your images with third parties</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <span>We <strong>never</strong> use your photos for model training</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <span>We <strong>never</strong> store your images permanently</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Data Retention */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Data Retention</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">
                      !
                    </span>
                    Uploaded Images
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deleted within <strong>5 minutes</strong> after processing completes. Our cleanup service runs every minute to ensure timely deletion.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Technical Logs</h3>
                  <p className="text-sm text-muted-foreground">
                    Retained for <strong>30 days</strong> for debugging and performance optimization. Contains no personal or image data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Your Rights</CardTitle>
              <CardDescription>You have full control over your data</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Access:</strong> Request information about data we may have</li>
                <li>• <strong>Deletion:</strong> Images are automatically deleted; logs can be cleared on request</li>
                <li>• <strong>Opt-out:</strong> Don&apos;t use Photo HD mode if you prefer local-only processing</li>
                <li>• <strong>Questions:</strong> Contact us at <a href="mailto:nawodyain@gmail.com" className="text-primary hover:underline">nawodyain@gmail.com</a></li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Cookies & Analytics */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Cookies & Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                We use minimal cookies for:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Session management</li>
                <li>• User preferences (theme, settings)</li>
              </ul>
              <p>
                We do <strong>not</strong> use third-party analytics or advertising cookies.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Security */}
        <section className="mb-12">
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-6 w-6 text-green-500" />
                <CardTitle className="text-2xl">Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>We implement industry-standard security measures:</p>
              <ul className="space-y-1 ml-4">
                <li>• HTTPS encryption for all data transfers</li>
                <li>• Secure server infrastructure</li>
                <li>• Regular security audits</li>
                <li>• Automatic deletion of temporary files</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Questions About Privacy?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                If you have any questions about this privacy policy or how we handle your data, please reach out:
              </p>
              <div className="space-y-2">
                <p>📧 Email: <a href="mailto:nawodyain@gmail.com" className="text-primary hover:underline">nawodyain@gmail.com</a></p>
                <p>💻 GitHub: <a href="https://github.com/nawodyaishan" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">@nawodyaishan</a></p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Research Disclaimer */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertDescription className="text-base">
            <strong>Research Project Notice:</strong> This is a research and demonstration project. Results are synthetic previews and not production-quality product photos. Colors, fit, and appearance may vary from actual products. Do not upload sensitive or private images.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
