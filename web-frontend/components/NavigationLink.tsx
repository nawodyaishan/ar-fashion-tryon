'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NavigationItem } from '@/lib/types';

interface NavigationLinkProps {
  item: NavigationItem;
  isActive: boolean;
}

export function NavigationLink({ item, isActive }: NavigationLinkProps) {
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          'relative h-10 px-4 transition-all duration-200',
          isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/80',
        )}
      >
        <Icon className="w-4 h-4 mr-2" />
        {item.title}
        {item.badge && (
          <Badge
            variant="secondary"
            className="ml-2 h-5 px-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
          >
            {item.badge}
          </Badge>
        )}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
        )}
      </Button>
    </Link>
  );
}
