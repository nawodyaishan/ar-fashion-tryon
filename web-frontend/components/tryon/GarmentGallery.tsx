'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTryonStore } from '@/lib/tryon-store';
import { Shirt, Package } from 'lucide-react';
import Image from 'next/image';

export default function GarmentGallery() {
  const { galleryModalOpen, closeGallery, garments, selectGarment } = useTryonStore();

  const handleSelectGarment = (id: string) => {
    selectGarment(id);
    closeGallery();
  };

  // Filter garments by category
  const tops = garments.filter((g) => g.category === 'tops');
  const jackets = garments.filter((g) => g.category === 'jackets');
  const misc = garments.filter((g) => !g.category || g.category === 'misc');

  return (
    <Dialog open={galleryModalOpen} onOpenChange={closeGallery}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto glassmorphic-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Garment Gallery
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tops">Tops</TabsTrigger>
            <TabsTrigger value="jackets">Jackets</TabsTrigger>
            <TabsTrigger value="misc">Misc</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <GarmentGrid garments={garments} onSelect={handleSelectGarment} />
          </TabsContent>

          <TabsContent value="tops" className="mt-4">
            <GarmentGrid garments={tops} onSelect={handleSelectGarment} />
          </TabsContent>

          <TabsContent value="jackets" className="mt-4">
            <GarmentGrid garments={jackets} onSelect={handleSelectGarment} />
          </TabsContent>

          <TabsContent value="misc" className="mt-4">
            <GarmentGrid garments={misc} onSelect={handleSelectGarment} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GarmentGrid({
  garments,
  onSelect,
}: {
  garments: Array<{
    id: string;
    name: string;
    src: string;
    width: number;
    height: number;
    sizeKb: number;
    category?: string;
  }>;
  onSelect: (id: string) => void;
}) {
  if (garments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Shirt className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No garments in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {garments.map((garment) => (
        <div
          key={garment.id}
          className="group relative rounded-lg border bg-card p-3 hover:border-primary/50 transition-all"
        >
          <div className="aspect-square relative bg-muted rounded-md mb-2 overflow-hidden">
            <Image
              src={garment.src}
              alt={garment.name}
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback for missing images
                e.currentTarget.src = '/placeholder-garment.png';
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium line-clamp-1">{garment.name}</h4>
              <Badge variant="secondary" className="text-xs shrink-0">
                {garment.sizeKb}KB
              </Badge>
            </div>

            <Button
              size="sm"
              className="w-full"
              onClick={() => onSelect(garment.id)}
              aria-label={`Use ${garment.name}`}
            >
              Use
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
