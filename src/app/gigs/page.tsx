'use client';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Clock, Users, Zap } from 'lucide-react';

export default function GigsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium mb-6">
            <Briefcase className="h-4 w-4" />
            Coming Soon
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
              Lightning Gigs
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Find and complete short-term tasks for instant Lightning payments.
            Perfect for freelancers and quick project work.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto mb-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Quick Tasks
                </div>
                <div className="text-sm text-muted-foreground">
                  Complete in hours, not days
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Instant Pay
                </div>
                <div className="text-sm text-muted-foreground">
                  Lightning payments on completion
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  Global
                </div>
                <div className="text-sm text-muted-foreground">
                  Work with anyone, anywhere
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-8 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">What to expect:</h3>
            <ul className="text-left space-y-2 text-muted-foreground">
              <li>• Browse available gigs by category and skill level</li>
              <li>• Submit proposals and get hired instantly</li>
              <li>• Complete tasks and receive Lightning payments</li>
              <li>• Build your reputation and earn more over time</li>
              <li>• Work on projects from around the world</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
