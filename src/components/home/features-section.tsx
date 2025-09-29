'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Award, Briefcase, Zap } from 'lucide-react';
import Link from 'next/link';

export function FeaturesSection() {
  return (
    <section className="mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">How LightningO Works</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          LightningO is a platform where anyone, anywhere can create and have
          access to earning opportunities powered by Nostr and receive payments
          instantly with the Lightning Network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Bounties</h3>
            <p className="text-muted-foreground mb-4">
              Complete specific tasks and get paid instantly with Lightning
            </p>
            <Link href="/bounties">
              <Button variant="outline" className="w-full">
                Explore Bounties
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gigs</h3>
            <p className="text-muted-foreground mb-4">
              Apply for project-based work with milestone payments
            </p>
            <Link href="/gigs">
              <Button variant="outline" className="w-full">
                Explore Gigs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Grants</h3>
            <p className="text-muted-foreground mb-4">
              Apply for funding for innovative projects and ideas
            </p>
            <Link href="/grants">
              <Button variant="outline" className="w-full">
                Explore Grants
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
