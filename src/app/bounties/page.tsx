'use client';

import { BountyCard } from '@/components/bounty/bounty-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Select } from '@/components/ui/select';
import { useCacheInitialization } from '@/lib/hooks/use-cache-initialization';
import { areKeysEqual } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import { Award, DollarSign, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BountiesPage() {
  const { bounties, isLoading, error, init } = useBounties();
  const { user } = useAuth();
  const { isInitialized, isLoading: cacheLoading } = useCacheInitialization();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isInitialized) {
      init();
    }
  }, [init, isInitialized]);

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

  // Show error state if there's an error
  if (error) {
    return (
      <div className="container mx-auto pt-4 px-4 sm:px-6 lg:px-8 py-16">
        <PageErrorState type="bounties" onRetry={() => init()} />
      </div>
    );
  }

  // Show skeleton loader while loading
  if (isLoading || cacheLoading) {
    return <PageSkeleton type="bounties" />;
  }

  return (
    <div className="container mx-auto pt-4 px-4 sm:px-6 lg:px-8 py-16">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bounties</h1>
        <p className="text-muted-foreground">
          Discover and complete bounties for Lightning payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mx-auto mb-3">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {bounties.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Bounties</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {totalReward.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Rewards (sats)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mx-auto mb-3">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {bounties.filter((b) => b.status === 'open').length}
            </div>
            <div className="text-sm text-muted-foreground">Open Bounties</div>
          </CardContent>
        </Card>
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
      {filteredBounties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty) => (
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
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
  );
}
