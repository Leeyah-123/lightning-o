'use client';
import { CtaSection } from '@/components/home/cta-section';
import { FeaturesSection } from '@/components/home/features-section';
import { HeroSection } from '@/components/home/hero-section';
import { RecentOpportunitiesSection } from '@/components/home/recent-opportunities-section';
import {
  Skeleton,
  SkeletonList,
  SkeletonStats,
} from '@/components/ui/skeleton-loader';
import { validationUtils } from '@/lib/validation';
import { useBounties } from '@/store/bounties';
import { useGigs } from '@/store/gigs';
import { useGrants } from '@/store/grants';
import { useEffect } from 'react';

export default function Home() {
  const {
    bounties,
    isLoading: bountiesLoading,
    error: bountiesError,
    init: initBounties,
  } = useBounties();
  const {
    gigs,
    isLoading: gigsLoading,
    error: gigsError,
    init: initGigs,
  } = useGigs();
  const {
    grants,
    isLoading: grantsLoading,
    error: grantsError,
    init: initGrants,
  } = useGrants();

  // Initialize all stores when component mounts
  useEffect(() => {
    initBounties();
    initGigs();
    initGrants();
  }, [initBounties, initGigs, initGrants]);

  // Check if any data is still loading
  const isLoading = bountiesLoading || gigsLoading || grantsLoading;
  const hasError = !!(bountiesError || gigsError || grantsError);

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
    grants.filter((grant) => grant.status === 'open').length;

  const recentBounties = bounties.slice(0, 2);
  const recentGigs = gigs.slice(0, 2);
  const recentGrants = grants.slice(0, 2);

  // Show loading state for hero section stats
  if (isLoading) {
    return (
      <>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl" />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                <Skeleton className="h-4 w-32" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <Skeleton className="h-16 w-64 mx-auto" />
              </h1>

              <div className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Skeleton className="h-12 w-48 mx-auto" />
                <Skeleton className="h-12 w-32 mx-auto" />
              </div>

              <SkeletonStats />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <FeaturesSection />
          <SkeletonList count={3} className="mb-16" />
          <CtaSection />
        </div>
      </>
    );
  }

  return (
    <>
      <HeroSection
        activeOpportunities={activeOpportunities}
        totalOpportunities={totalOpportunities}
        totalRewards={totalRewards}
        isLoading={isLoading}
        hasError={hasError}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FeaturesSection />

        <RecentOpportunitiesSection
          recentBounties={recentBounties}
          recentGigs={recentGigs}
          recentGrants={recentGrants}
        />

        <CtaSection />
      </div>
    </>
  );
}
