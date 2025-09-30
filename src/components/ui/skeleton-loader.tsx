'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className, children, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border p-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonStatsProps {
  className?: string;
}

export function SkeletonStats({ className }: SkeletonStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-6', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
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
