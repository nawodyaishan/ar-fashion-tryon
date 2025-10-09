'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTryonStore } from '@/lib/tryon-store';
import { Camera, ImageIcon, AlertCircle, Lightbulb, Settings } from 'lucide-react';
import { helpContent } from '@/lib/constants';

export default function HelpModal() {
  const { helpModalOpen, closeHelp } = useTryonStore();

  return (
    <Dialog open={helpModalOpen} onOpenChange={closeHelp}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto glassmorphic-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Help & Tutorials
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ar" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {helpContent.liveAR.title}
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {helpContent.photoHD.title}
            </TabsTrigger>
          </TabsList>

          {/* Live AR Tab */}
          <TabsContent value="ar" className="space-y-4 mt-4">
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-primary" />
                {helpContent.liveAR.gettingStarted.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.liveAR.gettingStarted.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                {helpContent.liveAR.bestPractices.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.liveAR.bestPractices.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                {helpContent.liveAR.troubleshooting.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.liveAR.troubleshooting.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{item.issue}:</strong> {item.solution}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>

          {/* Photo HD Tab */}
          <TabsContent value="photo" className="space-y-4 mt-4">
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-primary" />
                {helpContent.photoHD.howItWorks.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.photoHD.howItWorks.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                {helpContent.photoHD.bestResults.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.photoHD.bestResults.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                {helpContent.photoHD.troubleshooting.title}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {helpContent.photoHD.troubleshooting.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{item.issue}:</strong> {item.solution}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
