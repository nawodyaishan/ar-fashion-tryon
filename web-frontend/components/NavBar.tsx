'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModeToggle } from '@/components/ModeToggle';
import { NavigationLink } from '@/components/NavigationLink';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sparkles, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationItems } from '@/lib/constants';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-all duration-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AR Fashion
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">Try-On Studio</p>
            </div>
          </Link>

          {/* Navigation Menu - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return <NavigationLink key={item.href} item={item} isActive={isActive} />;
            })}
          </div>

          {/* Mobile Navigation Menu */}
          <div className="md:hidden">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-10 w-10 p-0">
                    <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                      <div className="w-full h-0.5 bg-current" />
                      <div className="w-full h-0.5 bg-current" />
                      <div className="w-full h-0.5 bg-current" />
                    </div>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[300px] gap-2 p-4">
                      {navigationItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                          <NavigationMenuLink key={item.href} asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-start space-x-3 rounded-lg p-3 transition-colors duration-200',
                                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                              )}
                            >
                              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{item.title}</p>
                                  {item.badge && (
                                    <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Settings Button - Desktop */}
            <div className="hidden md:block">
              <Link href="/settings">
                <Button
                  variant={pathname === '/settings' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>

            {/* Performance Indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Ready</span>
            </div>

            {/* Theme Toggle */}
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
