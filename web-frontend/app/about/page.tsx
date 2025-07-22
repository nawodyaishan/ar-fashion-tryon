import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-8 px-2 sm:px-4 md:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/10 dark:from-black/40 dark:via-black/20 dark:to-black/10 backdrop-blur-2xl -z-10" />
      <Card className="bg-white/60 dark:bg-black/40 border border-white/40 dark:border-black/40 shadow-xl backdrop-blur-md max-w-md w-full mx-auto">
        <CardHeader className="text-center">About</CardHeader>
        <CardContent>
          <p className="text-center">About the AR Fashion Try-On project coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
