'use client';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Award, Zap } from 'lucide-react';
import Link from 'next/link';

interface HeroProps {
  totalBounties: number;
  totalReward: number;
  activeBounties: number;
}

export function Hero({
  totalBounties,
  totalReward,
  activeBounties,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Powered by Nostr & Lightning
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Lightning Bounties
            </span>
            <br />
            <span className="text-foreground">for the Future of Work</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Create, fund, and complete bounties on the decentralized web. Built
            on Nostr and Lightning for instant, global payments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/bounties/create"
              className={buttonVariants({
                variant: 'default',
                size: 'lg',
                className:
                  'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 h-auto',
              })}
            >
              <Zap className="h-5 w-5 mr-2" />
              Create Your First Bounty
            </Link>
            <Link
              href="/bounties"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'text-lg px-8 py-4 h-auto',
              })}
            >
              Explore Bounties
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 pt-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-3">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {totalBounties}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Bounties
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 pt-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {totalReward.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Rewards (sats)
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 pt-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mx-auto mb-3">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {activeBounties}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Bounties
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
