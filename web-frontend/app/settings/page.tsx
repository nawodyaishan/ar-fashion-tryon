'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Palette,
  Shield,
  Download,
  RotateCcw,
  Trash2,
  Database,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';
import { privacyContent } from '@/lib/constants';
import { toast } from 'sonner';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';

export default function SettingsPage() {
  const { theme, setTheme, exportSettings, resetSettings } = useSettings();

  const handleDeleteUploads = () => {
    // Implement deletion logic here
    toast.success('Recent uploads deleted');
  };

  const handleClearCache = () => {
    // Implement cache clearing logic here
    toast.success('Local cache cleared');
  };

  const handleToggleDiagnostics = (checked: boolean) => {
    // Implement diagnostics toggle logic here
    toast.success(checked ? 'Diagnostics enabled' : 'Diagnostics disabled');
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <Settings className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Customize your experience and manage your data
          </p>
        </div>

        <div className="space-y-8">
          {/* Appearance Settings */}
          <section>
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <CardTitle>Appearance</CardTitle>
                </div>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Color Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={theme === option.value ? 'default' : 'outline'}
                        onClick={() => setTheme(option.value)}
                        className="h-20 flex-col gap-2"
                      >
                        <option.icon className="w-5 h-5" />
                        <span className="text-sm">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* Privacy & Data Section */}
          <section>
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle>{privacyContent.title}</CardTitle>
                </div>
                <CardDescription>
                  Manage your data and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Privacy Notice */}
                <Alert className="border-primary/30 bg-primary/5">
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-sm leading-relaxed">
                    <strong>How we handle your data:</strong> {privacyContent.description}
                  </AlertDescription>
                </Alert>

                {/* Data Storage Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base font-medium">{privacyContent.data.title}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {privacyContent.data.description}
                  </p>
                </div>

                <Separator />

                {/* Privacy Controls */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Privacy Controls</Label>

                  <div className="space-y-3">
                    {privacyContent.controls.map((control) => (
                      <div key={control.action}>
                        {control.variant === 'destructive' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant={control.variant}
                                className="w-full justify-start"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {control.label}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will permanently delete your recent uploads from our server. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteUploads}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : control.action === 'clearCache' ? (
                          <Button
                            variant={control.variant}
                            className="w-full justify-start"
                            onClick={handleClearCache}
                          >
                            <Database className="w-4 h-4 mr-2" />
                            {control.label}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <Label className="text-sm">{control.label}</Label>
                            <Switch onCheckedChange={handleToggleDiagnostics} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Settings Management */}
          <section>
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Settings Management</CardTitle>
                <CardDescription>
                  Backup or reset your settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={exportSettings} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Settings
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will restore all settings to their default values. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={resetSettings}>
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Export your settings to backup or transfer to another device.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* System Info */}
          <Card className="bg-accent/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">{APP_VERSION}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Build</p>
                  <p className="font-medium">{BUILD_DATE}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Engine</p>
                  <p className="font-medium">MediaPipe</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-medium text-green-700 dark:text-green-400">Ready</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
