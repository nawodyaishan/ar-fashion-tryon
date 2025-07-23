'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Heart,
  Eye,
  Sparkles,
  Shirt,
  Camera,
  Star,
  Clock,
  TrendingUp,
  Info,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'All Items', count: 127 },
  { id: 'tops', label: 'Tops', count: 45 },
  { id: 'dresses', label: 'Dresses', count: 32 },
  { id: 'outerwear', label: 'Outerwear', count: 28 },
  { id: 'accessories', label: 'Accessories', count: 22 },
];

const mockItems = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Fashion Item ${i + 1}`,
  category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1].id,
  price: Math.floor(Math.random() * 200) + 50,
  rating: 4 + Math.random(),
  reviews: Math.floor(Math.random() * 500) + 10,
  isNew: Math.random() > 0.7,
  isTrending: Math.random() > 0.8,
  colors: Math.floor(Math.random() * 5) + 1,
}));

function ItemSkeleton() {
  return (
    <Card className="group overflow-hidden">
      <div className="aspect-[3/4] relative overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-4 h-4 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function ItemCard({ item }: { item: (typeof mockItems)[0] }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
      {/* Image Placeholder */}
      <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <Shirt className="w-16 h-16 text-muted-foreground/50" />
        </div>

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {item.isNew && <Badge className="bg-green-500 hover:bg-green-600">New</Badge>}
          {item.isTrending && (
            <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>

        {/* Quick View */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            Quick View
          </Button>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
          {item.name}
        </h3>

        {/* Price and Rating */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">${item.price}</span>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{item.rating.toFixed(1)}</span>
            <span>({item.reviews})</span>
          </div>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          {Array.from({ length: item.colors }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-border"
              style={{
                backgroundColor: `hsl(${i * 60}, 70%, 50%)`,
              }}
            />
          ))}
          {item.colors > 4 && (
            <span className="text-xs text-muted-foreground ml-1">+{item.colors - 4} more</span>
          )}
        </div>

        {/* Try On Button */}
        <Button className="w-full group/btn">
          <Camera className="w-4 h-4 mr-2" />
          Try On
          <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GalleryPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const filteredItems = mockItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Fashion Gallery</h1>
              <p className="text-muted-foreground">Discover and try on the latest fashion trends</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Updated daily
              </Badge>
              <Badge variant="secondary" className="text-xs">
                127+ items
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search fashion items..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="text-xs sm:text-sm">
                  {category.label}
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                    {category.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Coming Soon Alert */}
        <Alert className="mb-8 border-blue-500/20 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <strong>Coming Soon:</strong> Our fashion gallery is currently being curated with the
            latest trends. In the meantime, try our <strong>AR Try-On Studio</strong> with your own
            garment images!
          </AlertDescription>
        </Alert>

        {/* Items Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ItemSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredItems.length} items
                  {selectedCategory !== 'all' &&
                    ` in ${categories.find((c) => c.id === selectedCategory)?.label}`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>

              <div
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No items found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or category filters
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
