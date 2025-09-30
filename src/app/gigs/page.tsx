'use client';

import { GigCard } from '@/components/gig/gig-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageErrorState } from '@/components/ui/error-state';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGigs } from '@/store/gigs';
import { Briefcase, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function GigsPage() {
  const { gigs, isLoading, error, init } = useGigs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    init();
  }, [init]);

  const filteredGigs = gigs.filter((gig) => {
    const searchText =
      `${gig.title} ${gig.shortDescription} ${gig.description}`.toLowerCase();
    const matchesSearch = searchText.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || gig.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openGigs = gigs.filter((gig) => gig.status === 'open').length;
  const totalGigs = gigs.length;

  const getStatusCounts = () => {
    const counts = {
      all: gigs.length,
      open: 0,
      application_selected: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    gigs.forEach((gig) => {
      counts[gig.status as keyof typeof counts]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  // Show error state if there's an error
  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageErrorState type="gigs" onRetry={() => init()} />
      </div>
    );
  }

  // Show skeleton loader while loading
  if (isLoading) {
    return <PageSkeleton type="gigs" />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gigs</h1>
            <p className="text-muted-foreground">
              Find short-term work opportunities and get paid with Lightning
            </p>
          </div>
          {user && (
            <Link href="/gigs/create">
              <Button className="bg-blue-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Gig
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {totalGigs}
              </div>
              <div className="text-sm text-muted-foreground">Total Gigs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {openGigs}
              </div>
              <div className="text-sm text-muted-foreground">Open Gigs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {statusCounts.in_progress}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {statusCounts.completed}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="application_selected">Application Selected</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gigs Grid */}
      {filteredGigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.map((gig) => {
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
      ) : (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No gigs found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Be the first to create a gig!'}
          </p>
          {user && !searchQuery && statusFilter === 'all' && (
            <Link href="/gigs/create">
              <Button className="bg-blue-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Gig
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
