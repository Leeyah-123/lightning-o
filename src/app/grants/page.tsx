'use client';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Award, DollarSign, Target, Users } from 'lucide-react';

export default function GrantsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
            <Award className="h-4 w-4" />
            Coming Soon
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
              Lightning Grants
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Apply for funding for your innovative projects and ideas. Get
            Lightning payments to build the future of decentralized work.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Funding
                </div>
                <div className="text-sm text-muted-foreground">
                  Get paid for your ideas
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-3">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Focus
                </div>
                <div className="text-sm text-muted-foreground">
                  Work on what matters
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mx-auto mb-3">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Community
                </div>
                <div className="text-sm text-muted-foreground">
                  Build with others
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-8 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">What to expect:</h3>
            <ul className="text-left space-y-2 text-muted-foreground">
              <li>• Submit detailed project proposals for review</li>
              <li>• Get funding for innovative ideas and projects</li>
              <li>• Receive milestone-based Lightning payments</li>
              <li>• Connect with mentors and collaborators</li>
              <li>• Build the future of decentralized work</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
