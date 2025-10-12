'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Github, MessageSquare, ExternalLink } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions, feedback, or just want to say hi? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Email */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 text-blue-500">
                  <Mail className="h-5 w-5" />
                </div>
                <CardTitle>Email</CardTitle>
              </div>
              <CardDescription>Best for detailed questions or feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a href="mailto:nawodyain@gmail.com">
                  <span>nawodyain@gmail.com</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* GitHub */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 text-purple-500">
                  <Github className="h-5 w-5" />
                </div>
                <CardTitle>GitHub</CardTitle>
              </div>
              <CardDescription>For technical issues and contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a href="https://github.com/nawodyaishan" target="_blank" rel="noopener noreferrer">
                  <span>@nawodyaishan</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Repository Links */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Project Repository</CardTitle>
              <CardDescription>
                View source code, report issues, or contribute to the project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" asChild>
                <a
                  href="https://github.com/nawodyaishan/ar-fashion-tryon"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View Source Code</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a
                  href="https://github.com/nawodyaishan/ar-fashion-tryon/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Report an Issue</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <a
                  href="https://github.com/nawodyaishan/ar-fashion-tryon/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Join Discussions</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Answers</CardTitle>
              <CardDescription>Common questions we receive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">How do I report a bug?</h3>
                  <p className="text-sm text-muted-foreground">
                    Please create an issue on our{' '}
                    <a
                      href="https://github.com/nawodyaishan/ar-fashion-tryon/issues"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub repository
                    </a>
                    {' '}with details about the problem and steps to reproduce it.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Can I contribute to the project?</h3>
                  <p className="text-sm text-muted-foreground">
                    Absolutely! We welcome contributions. Check out our repository for contribution guidelines,
                    or reach out via email to discuss ideas.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Is this project open source?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes! The entire project is available on GitHub. Feel free to explore, learn, and contribute.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">How can I use this for commercial purposes?</h3>
                  <p className="text-sm text-muted-foreground">
                    Please reach out to us via email at{' '}
                    <a href="mailto:nawodyain@gmail.com" className="text-primary hover:underline">
                      nawodyain@gmail.com
                    </a>
                    {' '}to discuss licensing and commercial use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Response Time Notice */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-muted-foreground">
              <strong>Response Time:</strong> We typically respond within 24-48 hours during weekdays.
              For urgent technical issues, please use GitHub Issues for faster community support.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
