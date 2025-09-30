'use client';

import { Skeleton, SkeletonCard } from './skeleton-loader';

interface PageSkeletonProps {
  type: 'bounties' | 'gigs' | 'grants';
}

export function PageSkeleton({ type }: PageSkeletonProps) {
  const getStatsCount = () => {
    switch (type) {
      case 'bounties':
        return 3;
      case 'gigs':
        return 4;
      case 'grants':
        return 3;
      default:
        return 3;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: getStatsCount() }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="space-y-3">
                <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

interface StatsSkeletonProps {
  count?: number;
}

export function StatsSkeleton({ count = 3 }: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ContentGridSkeletonProps {
  count?: number;
}

export function ContentGridSkeleton({ count = 6 }: ContentGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
