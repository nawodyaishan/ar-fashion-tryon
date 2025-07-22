import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-8 px-2 sm:px-4 md:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/10 dark:from-black/40 dark:via-black/20 dark:to-black/10 backdrop-blur-2xl -z-10" />
      <div className="w-full max-w-6xl mx-auto grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Try On Card */}
        <Card className="bg-white/60 dark:bg-black/40 border border-white/40 dark:border-black/40 shadow-xl backdrop-blur-md flex flex-col h-full justify-between mx-auto w-full max-w-xs sm:max-w-none">
          <CardHeader className="text-center">Try On</CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <Image src="/vercel.svg" alt="Try On" width={60} height={60} className="mb-2" />
            <p className="text-center">Experience AR fashion try-on with your camera.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <a href="/try-on">Start Now</a>
            </Button>
          </CardFooter>
        </Card>
        {/* Gallery Card */}
        <Card className="bg-white/60 dark:bg-black/40 border border-white/40 dark:border-black/40 shadow-xl backdrop-blur-md flex flex-col h-full justify-between mx-auto w-full max-w-xs sm:max-w-none">
          <CardHeader className="text-center">Gallery</CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <Image src="/window.svg" alt="Gallery" width={60} height={60} className="mb-2" />
            <p className="text-center">Browse outfits and looks from our AR collection.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="secondary">
              <a href="/gallery">View Gallery</a>
            </Button>
          </CardFooter>
        </Card>
        {/* About Card */}
        <Card className="bg-white/60 dark:bg-black/40 border border-white/40 dark:border-black/40 shadow-xl backdrop-blur-md flex flex-col h-full justify-between mx-auto w-full max-w-xs sm:max-w-none">
          <CardHeader className="text-center">About</CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <Image src="/globe.svg" alt="About" width={60} height={60} className="mb-2" />
            <p className="text-center">Learn more about the AR Fashion Try-On project.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <a href="/about">Learn More</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
