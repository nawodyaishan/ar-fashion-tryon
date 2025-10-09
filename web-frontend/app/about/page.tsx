'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { aboutContent } from '@/lib/constants';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        {/* Lead Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            {aboutContent.lead.title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {aboutContent.lead.intro}
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-center text-muted-foreground leading-relaxed">
                {aboutContent.mission}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Principles Section */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Our Principles</h2>
            <p className="text-lg text-muted-foreground">
              The values that guide our development
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {aboutContent.principles.map((principle) => (
              <Card key={principle.title} className="border-2 text-center">
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-3">
                    <principle.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{principle.title}</CardTitle>
                  <CardDescription className="text-base">{principle.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Technology Section */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">{aboutContent.technology.title}</h2>
            <p className="text-lg text-muted-foreground">
              {aboutContent.technology.intro}
            </p>
          </div>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {aboutContent.technology.stack.map((tech) => (
                  <div key={tech.name} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <span className="font-semibold">{tech.name}</span>
                      <span className="text-muted-foreground"> {tech.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Responsible Use Section */}
        <section className="mb-16">
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-base">
              <strong>{aboutContent.responsibleUse.title}:</strong> {aboutContent.responsibleUse.note}
            </AlertDescription>
          </Alert>
        </section>

        {/* Credits & Links Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">{aboutContent.credits.title}</h2>
            <p className="text-muted-foreground">
              {aboutContent.credits.note}
            </p>
          </div>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-3">
                {aboutContent.credits.links.map((link) => (
                  <Button
                    key={link.label}
                    variant="outline"
                    asChild
                    className="justify-between h-auto py-3"
                  >
                    <Link href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                      <span>{link.label}</span>
                      {link.href.startsWith('http') && <ExternalLink className="h-4 w-4 ml-2" />}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="mt-16 text-center">
          <Card className="border-2 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
            <CardContent className="pt-8 pb-8">
              <h3 className="text-2xl font-bold mb-3">Ready to try it out?</h3>
              <p className="text-muted-foreground mb-6">
                Experience the hybrid try-on system yourself
              </p>
              <Button size="lg" asChild>
                <Link href="/try-on">
                  Start Try-On
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
