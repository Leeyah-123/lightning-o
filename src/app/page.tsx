'use client';
import { CtaSection } from '@/components/home/cta-section';
import { FeaturesSection } from '@/components/home/features-section';
import { HeroSection } from '@/components/home/hero-section';
import { RecentOpportunitiesSection } from '@/components/home/recent-opportunities-section';
import { validationUtils } from '@/lib/validation';
import { useBounties } from '@/store/bounties';
import { useGigs } from '@/store/gigs';
import { useGrants } from '@/store/grants';
import { useEffect, useState } from 'react';

export default function Home() {
  const { bounties, init: initBounties } = useBounties();
  const { gigs, init: initGigs } = useGigs();
  const { grants, init: initGrants } = useGrants();
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
    grants.filter((grant) => grant.status === 'open').length;

  const recentBounties = bounties.slice(0, 2);
  const recentGigs = gigs.slice(0, 2);
  const recentGrants = grants.slice(0, 2);

  return (
    <>
      <HeroSection
        activeOpportunities={activeOpportunities}
        totalOpportunities={totalOpportunities}
        totalRewards={totalRewards}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FeaturesSection />

        <RecentOpportunitiesSection
          recentBounties={recentBounties}
          recentGigs={recentGigs}
          recentGrants={recentGrants}
          isInitialized={isInitialized}
        />

        <CtaSection />
      </div>
    </>
  );
}
