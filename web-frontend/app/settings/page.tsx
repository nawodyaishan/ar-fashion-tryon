'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/settings-store';

export default function SettingsPage() {
  const lighting = useSettingsStore((s) => s.lighting);
  const setLighting = useSettingsStore((s) => s.setLighting);

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-8 px-2 sm:px-4 md:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/10 dark:from-black/40 dark:via-black/20 dark:to-black/10 backdrop-blur-2xl -z-10" />
      <Card className="bg-white/60 dark:bg-black/40 border border-white/40 dark:border-black/40 shadow-xl backdrop-blur-md max-w-md w-full mx-auto">
        <CardHeader className="text-center text-xl font-bold">Settings</CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            <span className="font-medium">Background Lighting Effects</span>
            <Switch checked={lighting} onCheckedChange={setLighting} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
