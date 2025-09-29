'use client';
import { BountyCard } from '@/components/bounty/bounty-card';
import { GigCard } from '@/components/gig/gig-card';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Hero } from '@/components/layout/hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { validationUtils } from '@/lib/validation';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import { useGigs } from '@/store/gigs';
import { useGrants } from '@/store/grants';
import { ArrowRight, Award, Briefcase, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const { bounties, init: initBounties } = useBounties();
  const { gigs, init: initGigs } = useGigs();
  const { grants, init: initGrants } = useGrants();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([initBounties(), initGigs(), initGrants()]);
      setIsInitialized(true);
    };
    initializeData();
  }, [initBounties, initGigs, initGrants]);

  // Calculate combined stats
  const totalBountyReward = bounties.reduce(
    (sum, bounty) => sum + validationUtils.getTotalReward(bounty.rewardSats),
    0
  );

  const totalGigReward = gigs.reduce((sum, gig) => {
    if (gig.selectedApplicationId) {
      const selectedApp = gig.applications.find(
        (app) => app.id === gig.selectedApplicationId
      );
      if (selectedApp) {
        return (
          sum +
          selectedApp.milestones.reduce(
            (milestoneSum, milestone) => milestoneSum + milestone.amountSats,
            0
          )
        );
      }
    }
    return sum;
  }, 0);

  const totalGrantReward = grants.reduce((sum, grant) => {
    if (grant.reward.type === 'fixed') {
      return sum + grant.reward.amount;
    } else {
      return sum + (grant.reward.maxAmount || grant.reward.amount);
    }
  }, 0);

  const totalRewards = totalBountyReward + totalGigReward + totalGrantReward;
  const totalOpportunities = bounties.length + gigs.length + grants.length;
  const activeOpportunities =
    bounties.filter((bounty) => bounty.status === 'open').length +
    gigs.filter((gig) => gig.status === 'open' || gig.status === 'in_progress')
      .length +
    grants.filter(
      (grant) =>
        grant.status === 'open' ||
        grant.status === 'partially_active' ||
        grant.status === 'active'
    ).length;

  const recentBounties = bounties.slice(0, 3);
  const recentGigs = gigs.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <Hero
        activeOpportunities={activeOpportunities}
        totalOpportunities={totalOpportunities}
        totalRewards={totalRewards}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Features Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How LightningO Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete platform for earning opportunities powered by Nostr and
              Lightning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
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

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
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

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
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

        {/* Recent Bounties */}
        {isInitialized &&
          (recentBounties.length > 0 || recentGigs.length > 0) && (
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Recent Opportunities</h2>
                <div className="flex gap-2">
                  <Link href="/bounties">
                    <Button variant="outline">
                      View All Bounties
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/gigs">
                    <Button variant="outline">
                      View All Gigs
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentBounties.map((bounty) => {
                  const userHexPubkey = user?.pubkey
                    ? profileService.getHexFromNpub(user.pubkey)
                    : undefined;
                  return (
                    <BountyCard
                      key={bounty.id}
                      bounty={bounty}
                      isOwner={userHexPubkey === bounty.sponsorPubkey}
                      currentUserPubkey={user?.pubkey}
                    />
                  );
                })}
                {recentGigs.map((gig) => {
                  const userHexPubkey = user?.pubkey
                    ? profileService.getHexFromNpub(user.pubkey)
                    : undefined;
                  return (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      isOwner={userHexPubkey === gig.sponsorPubkey}
                      currentUserPubkey={user?.pubkey}
                    />
                  );
                })}
              </div>
            </section>
          )}

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the future of decentralized earning. Create opportunities, find
            work, and get paid instantly with Lightning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/bounties">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Explore Bounties
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
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
      </main>

      <Footer />
    </div>
  );
}
