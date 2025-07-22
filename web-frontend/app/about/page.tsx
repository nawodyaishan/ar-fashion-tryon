'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Camera, 
  Cpu, 
  Globe,
  Github,
  Heart,
  Users,
  Zap,
  Brain,
  Shield,
  Smartphone,
  Code,
  Lightbulb,
  Rocket,
  Target,
  CheckCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

const techStack = [
  { name: 'Next.js 15', description: 'React framework with App Router', icon: Code },
  { name: 'MediaPipe', description: 'Real-time pose detection', icon: Brain },
  { name: 'Three.js', description: '3D graphics and rendering', icon: Cpu },
  { name: 'TypeScript', description: 'Type-safe development', icon: Shield },
  { name: 'Tailwind CSS', description: 'Modern styling framework', icon: Lightbulb },
  { name: 'shadcn/ui', description: 'Beautiful UI components', icon: Sparkles }
];

const roadmapItems = [
  { title: 'Basic AR Try-On', status: 'completed', progress: 100 },
  { title: 'Image Upload System', status: 'completed', progress: 100 },
  { title: 'Real-time Processing', status: 'in-progress', progress: 75 },
  { title: 'Fashion Gallery', status: 'in-progress', progress: 45 },
  { title: 'AI Recommendations', status: 'planned', progress: 0 },
  { title: 'Social Sharing', status: 'planned', progress: 0 }
];

const features = [
  {
    icon: Camera,
    title: 'Advanced AR Technology',
    description: 'State-of-the-art augmented reality for realistic virtual try-on experiences.'
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'Lightning-fast processing with optimized algorithms for instant results.'
  },
  {
    icon: Shield,
    title: 'Privacy-First Design',
    description: 'All processing happens locally on your device. Your images never leave your browser.'
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform',
    description: 'Works seamlessly across desktop, mobile, and tablet devices.'
  }
];

const stats = [
  { label: 'Beta Users', value: '10K+', icon: Users },
  { label: 'Try-On Sessions', value: '50K+', icon: Camera },
  { label: 'Accuracy Rate', value: '98%', icon: Target },
  { label: 'Processing Speed', value: '<2s', icon: Zap }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">
                About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AR Fashion Try-On
                </span>
              </h1>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Revolutionizing online fashion shopping with cutting-edge augmented reality technology. 
            Try on clothes virtually with unprecedented realism and accuracy.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/try-on">
              <Button size="lg" className="h-12 px-6">
                <Camera className="w-5 h-5 mr-2" />
                Try It Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-6" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5 mr-2" />
                View Source
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mission Statement */}
        <Card className="mb-16 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We believe the future of fashion retail is virtual. Our mission is to eliminate the guesswork 
                in online shopping by providing the most accurate and intuitive AR try-on experience possible, 
                making fashion accessible and enjoyable for everyone.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose AR Fashion Try-On?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with the latest technology to deliver an unparalleled virtual shopping experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Technology Stack</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powered by cutting-edge technologies and modern web standards
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {techStack.map((tech) => (
              <Card key={tech.name} className="group hover:shadow-md transition-all duration-300">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <tech.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">{tech.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Development Roadmap</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track our progress as we continue to innovate and improve the AR try-on experience
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {roadmapItems.map((item) => (
                  <div key={item.title} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : item.status === 'in-progress' ? (
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full" />
                        )}
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <Badge 
                        variant={item.status === 'completed' ? 'default' : item.status === 'in-progress' ? 'secondary' : 'outline'}
                        className={item.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {item.status === 'completed' ? 'Done' : 
                         item.status === 'in-progress' ? 'In Progress' : 'Planned'}
                      </Badge>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-primary/20">
          <CardContent className="pt-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready to Experience the Future?</h2>
                <p className="text-muted-foreground">
                  Join thousands of users who are already experiencing the magic of AR fashion try-on
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Link href="/try-on">
                  <Button size="lg" className="h-12 px-8">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Your Journey
                  </Button>
                </Link>
                <Link href="/gallery">
                  <Button variant="outline" size="lg" className="h-12 px-8">
                    Explore Gallery
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <Alert className="max-w-2xl mx-auto">
            <Globe className="h-4 w-4" />
            <AlertDescription>
              This project is open source and built with ❤️ for the community. 
              Contributions and feedback are always welcome!
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}