'use client';

import { GrantCard } from '@/components/grant/grant-card';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { Award, DollarSign, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function GrantsPage() {
  const { grants, init } = useGrants();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await init();
      setIsInitialized(true);
    };
    initializeData();
  }, [init]);

  const openGrants = grants.filter((grant) => grant.status === 'open');
  const activeGrants = grants.filter(
    (grant) => grant.status === 'partially_active' || grant.status === 'active'
  );
  const completedGrants = grants.filter(
    (grant) => grant.status === 'completed'
  );

  const totalReward = grants.reduce((sum, grant) => {
    if (grant.reward.type === 'fixed') {
      return sum + grant.reward.amount;
    } else {
      return sum + (grant.reward.maxAmount || grant.reward.amount);
    }
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
              Lightning Grants
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Apply for funding for your innovative projects and ideas. Get
            Lightning payments to build the future of decentralized work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/grants/create">
              <Button
                size="lg"
                className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Grant
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const grantsSection = document.getElementById('grants-list');
                grantsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Award className="h-5 w-5 mr-2" />
              Apply for Funding
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-3">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {grants.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Grants</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {totalReward.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Funding (sats)
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mx-auto mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {activeGrants.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Grants</div>
            </CardContent>
          </Card>
        </div>

        {/* Grants List */}
        {isInitialized ? (
          <div id="grants-list" className="space-y-8">
            {/* Open Grants */}
            {openGrants.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Open for Applications</h2>
                  <span className="text-sm text-muted-foreground">
                    {openGrants.length} grant
                    {openGrants.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openGrants.map((grant) => {
                    const userHexPubkey = user?.pubkey
                      ? profileService.getHexFromNpub(user.pubkey)
                      : undefined;
                    return (
                      <GrantCard
                        key={grant.id}
                        grant={grant}
                        isOwner={userHexPubkey === grant.sponsorPubkey}
                        currentUserPubkey={user?.pubkey}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Active Grants */}
            {activeGrants.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Active Grants</h2>
                  <span className="text-sm text-muted-foreground">
                    {activeGrants.length} grant
                    {activeGrants.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeGrants.map((grant) => {
                    const userHexPubkey = user?.pubkey
                      ? profileService.getHexFromNpub(user.pubkey)
                      : undefined;
                    return (
                      <GrantCard
                        key={grant.id}
                        grant={grant}
                        isOwner={userHexPubkey === grant.sponsorPubkey}
                        currentUserPubkey={user?.pubkey}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed Grants */}
            {completedGrants.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Completed Grants</h2>
                  <span className="text-sm text-muted-foreground">
                    {completedGrants.length} grant
                    {completedGrants.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedGrants.map((grant) => {
                    const userHexPubkey = user?.pubkey
                      ? profileService.getHexFromNpub(user.pubkey)
                      : undefined;
                    return (
                      <GrantCard
                        key={grant.id}
                        grant={grant}
                        isOwner={userHexPubkey === grant.sponsorPubkey}
                        currentUserPubkey={user?.pubkey}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty State */}
            {grants.length === 0 && (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No grants yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a grant and start funding innovative
                  projects.
                </p>
                <Link href="/grants/create">
                  <Button className="bg-green-600 hover:from-green-700 hover:to-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Grant
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading grants...</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
