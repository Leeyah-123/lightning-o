'use client';

import { BountyCard } from '@/components/bounty/bounty-card';
import { GigCard } from '@/components/gig/gig-card';
import { GrantCard } from '@/components/grant/grant-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { Bounty } from '@/types/bounty';
import { Gig } from '@/types/gig';
import { Grant } from '@/types/grant';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RecentOpportunitiesSectionProps {
  recentBounties: Bounty[];
  recentGigs: Gig[];
  recentGrants: Grant[];
}

export function RecentOpportunitiesSection({
  recentBounties,
  recentGigs,
  recentGrants,
}: RecentOpportunitiesSectionProps) {
  const { user } = useAuth();

  if (
    recentBounties.length === 0 &&
    recentGigs.length === 0 &&
    recentGrants.length === 0
  ) {
    return null;
  }

  return (
    <section className="mb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-bold">Recent Opportunities</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/bounties">
            <Button variant="outline" size="sm">
              View All Bounties
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/gigs">
            <Button variant="outline" size="sm">
              View All Gigs
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/grants">
            <Button variant="outline" size="sm">
              View All Grants
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentBounties.map((bounty) => {
          return (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              isOwner={user?.pubkey === bounty.sponsorPubkey}
              currentUserPubkey={user?.pubkey}
            />
          );
        })}
        {recentGigs.map((gig) => {
          return (
            <GigCard
              key={gig.id}
              gig={gig}
              isOwner={user?.pubkey === gig.sponsorPubkey}
              currentUserPubkey={user?.pubkey}
            />
          );
        })}
        {recentGrants.map((grant) => {
          return (
            <GrantCard
              key={grant.id}
              grant={grant}
              isOwner={user?.pubkey === grant.sponsorPubkey}
              currentUserPubkey={user?.pubkey}
            />
          );
        })}
      </div>
    </section>
  );
}
