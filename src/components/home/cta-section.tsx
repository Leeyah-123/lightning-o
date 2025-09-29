'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function CtaSection() {
  const { user } = useAuth();

  return (
    <section className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl p-12">
      <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Join the future of decentralized earning. Create opportunities, find
        work, and get paid instantly with Lightning.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {user ? (
          <>
            <Link href="/bounties">
              <Button
                size="lg"
                className="bg-blue-600 hover:from-blue-700 hover:to-purple-700"
              >
                Explore Bounties
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/gigs">
              <Button
                size="lg"
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                Explore Gigs
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/grants">
              <Button
                size="lg"
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                Explore Grants
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </>
        ) : (
          <Button
            size="lg"
            className="bg-blue-600 hover:from-blue-700 hover:to-purple-700"
            data-connect-wallet
            onClick={() => {
              const connectButton = document.querySelector(
                '[data-connect-wallet]'
              ) as HTMLButtonElement;
              connectButton?.click();
            }}
          >
            Connect Nostr
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>
    </section>
  );
}
