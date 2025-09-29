'use client';

import { BountyCard } from '@/components/bounty/bounty-card';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { areKeysEqual } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BountiesPage() {
  const { bounties, init } = useBounties();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const filteredBounties = bounties.filter((bounty) => {
    const matchesSearch =
      bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bounty.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || bounty.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalReward = bounties.reduce((sum, bounty) => {
    if (Array.isArray(bounty.rewardSats)) {
      return sum + bounty.rewardSats.reduce((acc, reward) => acc + reward, 0);
    }
    return sum + bounty.rewardSats;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bounties</h1>
          <p className="text-muted-foreground">
            Discover and complete bounties for Lightning payments
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold">{bounties.length}</div>
            <div className="text-sm text-muted-foreground">Total Bounties</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold">
              {totalReward.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Rewards (sats)
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-2xl font-bold">
              {bounties.filter((b) => b.status === 'open').length}
            </div>
            <div className="text-sm text-muted-foreground">Open Bounties</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bounties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </Select>
            {user && (
              <Link href="/bounties/create">
                <Button className="bg-blue-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bounty
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Bounties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && bounties.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : filteredBounties.length > 0 ? (
            filteredBounties.map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                isOwner={
                  user?.pubkey && bounty.sponsorPubkey
                    ? areKeysEqual(user.pubkey, bounty.sponsorPubkey)
                    : false
                }
                isLoading={isLoading}
                currentUserPubkey={user?.pubkey}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'No bounties match your filters.'
                  : 'No bounties yet. Be the first to create one!'}
              </div>
              {!searchQuery && statusFilter === 'all' && user && (
                <Link href="/bounties/create">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Bounty
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
