'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTryonStore } from '@/lib/tryon-store';
import { Camera, ImageIcon, AlertCircle, Lightbulb, Settings } from 'lucide-react';

export default function HelpModal() {
  const { helpModalOpen, closeHelp } = useTryonStore();

  return (
    <Dialog open={helpModalOpen} onOpenChange={closeHelp}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto glassmorphic-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Help & Tips
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ar" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Live AR
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Photo HD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ar" className="space-y-4 mt-4">
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-primary" />
                Getting Started
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Allow camera access when prompted by your browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Stand 3-4 feet away from the camera in good lighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Select a garment from the panel on the right</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Use the transform controls to adjust size, position, and rotation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <span>Click &quot;Take Screenshot&quot; to save your try-on</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Best Practices
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Lighting:</strong> Use natural light or bright indoor lighting. Avoid
                    backlighting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Positioning:</strong> Face the camera directly with your shoulders
                    visible.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Background:</strong> Plain backgrounds work best for clear visualization.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Auto-Align:</strong> Click &quot;Auto-Align&quot; to automatically
                    position the garment (demo mode).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Show Landmarks:</strong> Toggle to see shoulder guide points for better
                    alignment.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Troubleshooting
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Camera not working?</strong> Check browser permissions in
                    Settings→Privacy→Camera.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Low quality?</strong> Ensure adequate lighting and clean your camera
                    lens.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Laggy performance?</strong> Close other tabs and applications using your
                    camera.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Garment misaligned?</strong> Use the transform sliders to manually adjust
                    position and size.
                  </span>
                </li>
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 mt-4">
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-primary" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Upload a clear photo of yourself facing the camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Choose a garment from the gallery or upload your own</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Click &quot;Try-On&quot; to generate the high-quality result</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Download or regenerate with different garments</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Best Results
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Photo quality:</strong> Use high-resolution images (at least 1024px
                    width).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Body position:</strong> Full upper body visible, arms at sides or
                    slightly out.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Garment photos:</strong> Front-view garments on plain backgrounds work
                    best.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>File format:</strong> PNG with transparency is ideal; JPG works too.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Troubleshooting
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Upload failed?</strong> Check file size (max 10MB) and format (JPG, PNG).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Processing takes too long?</strong> Try a smaller image or check your
                    internet connection.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Poor results?</strong> Ensure clear body visibility and try a different
                    garment angle.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>API error?</strong> The service may be temporarily unavailable. Try again
                    later.
                  </span>
                </li>
              </ul>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
