'use client';

import { GrantCard } from '@/components/grant/grant-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageErrorState } from '@/components/ui/error-state';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useCacheInitialization } from '@/lib/hooks/use-cache-initialization';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils } from '@/types/grant';
import { Award, DollarSign, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StatusFilter = 'all' | 'open' | 'closed';
type PriceRangeFilter =
  | 'all'
  | '0-10000'
  | '10000-50000'
  | '50000-100000'
  | '100000+';

export default function GrantsPage() {
  const { grants, isLoading, error, init } = useGrants();
  const { user } = useAuth();
  const { isInitialized, isLoading: cacheLoading } = useCacheInitialization();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priceRangeFilter, setPriceRangeFilter] =
    useState<PriceRangeFilter>('all');

  useEffect(() => {
    if (isInitialized) {
      init();
    }
  }, [init, isInitialized]);

  // Filter grants based on search and filters
  const filteredGrants = useMemo(() => {
    return grants.filter((grant) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = grant.title.toLowerCase().includes(query);
        const matchesDescription = grant.shortDescription
          .toLowerCase()
          .includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'open' && grant.status !== 'open') return false;
        if (statusFilter === 'closed' && grant.status !== 'closed')
          return false;
      }

      // Price range filter
      if (priceRangeFilter !== 'all') {
        const grantAmount =
          grant.reward.type === 'fixed'
            ? grant.reward.amount
            : grant.reward.maxAmount || grant.reward.amount;

        switch (priceRangeFilter) {
          case '0-10000':
            if (grantAmount > 10000) return false;
            break;
          case '10000-50000':
            if (grantAmount < 10000 || grantAmount > 50000) return false;
            break;
          case '50000-100000':
            if (grantAmount < 50000 || grantAmount > 100000) return false;
            break;
          case '100000+':
            if (grantAmount < 100000) return false;
            break;
        }
      }

      return true;
    });
  }, [grants, searchQuery, statusFilter, priceRangeFilter]);

  const totalReward = grants.reduce((sum, grant) => {
    if (grant.reward.type === 'fixed') {
      return sum + grant.reward.amount;
    } else {
      return sum + (grant.reward.maxAmount || grant.reward.amount);
    }
  }, 0);

  const activeGrantsCount = grants.filter((grant) =>
    grantUtils.isActive(grant)
  ).length;

  // Show error state if there's an error
  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageErrorState type="grants" onRetry={() => init()} />
      </div>
    );
  }

  // Show skeleton loader while loading
  if (isLoading || cacheLoading) {
    return <PageSkeleton type="grants" />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Grants</h1>
            <p className="text-muted-foreground">
              Apply for funding for your innovative projects and ideas
            </p>
          </div>
          {user && (
            <Link href="/grants/create">
              <Button className="bg-green-600 hover:from-green-700 hover:to-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Grant
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mx-auto mb-3">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {grants.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Grants</div>
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
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {activeGrantsCount}
              </div>
              <div className="text-sm text-muted-foreground">Active Grants</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search grants by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priceRangeFilter}
            onChange={(e) =>
              setPriceRangeFilter(e.target.value as PriceRangeFilter)
            }
            className="px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Price Ranges</option>
            <option value="0-10000">0 - 10,000 sats</option>
            <option value="10000-50000">10,000 - 50,000 sats</option>
            <option value="50000-100000">50,000 - 100,000 sats</option>
            <option value="100000+">100,000+ sats</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Grants</h2>
        <span className="text-sm text-muted-foreground">
          {filteredGrants.length} grant
          {filteredGrants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grants List */}
      <div id="grants-list">
        {filteredGrants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGrants.map((grant) => {
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
        ) : (
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ||
              statusFilter !== 'all' ||
              priceRangeFilter !== 'all'
                ? 'No grants match your filters'
                : 'No grants yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ||
              statusFilter !== 'all' ||
              priceRangeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to create a grant and start funding innovative projects.'}
            </p>
            {searchQuery ||
            statusFilter !== 'all' ||
            priceRangeFilter !== 'all' ? (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriceRangeFilter('all');
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            ) : (
              <Link href="/grants/create">
                <Button className="bg-green-600 hover:from-green-700 hover:to-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Grant
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
