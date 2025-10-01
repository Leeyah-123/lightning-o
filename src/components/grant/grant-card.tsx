'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/hooks/use-toast';
import { useGrants } from '@/store/grants';
import type { Grant } from '@/types/grant';
import { grantUtils } from '@/types/grant';
import { Award, Calendar, DollarSign, ExternalLink, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GrantCardProps {
  grant: Grant;
  isOwner?: boolean;
  currentUserPubkey?: string;
}

export function GrantCard({
  grant,
  isOwner,
  currentUserPubkey,
}: GrantCardProps) {
  const router = useRouter();
  const { cancelGrant } = useGrants();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const displayStatus = grantUtils.getDisplayStatus(grant);
  const canApply = grantUtils.canApply(grant);
  const canCancel = grantUtils.canCancel(grant);

  // Check if current user has applied
  const hasUserApplied =
    currentUserPubkey &&
    grant.applications.some((app) => currentUserPubkey === app.applicantPubkey);

  // Check if current user is selected
  const isUserSelected =
    currentUserPubkey &&
    grant.selectedApplicationIds.some((appId) => {
      const application = grant.applications.find((app) => app.id === appId);
      return application && currentUserPubkey === application.applicantPubkey;
    });

  const handleViewDetails = () => {
    router.push(`/grants/${grant.id}`);
  };

  const handleApply = () => {
    if (!currentUserPubkey) {
      // Show login modal
      const connectButton = document.querySelector(
        '[data-connect-wallet]'
      ) as HTMLButtonElement;
      connectButton?.click();
      return;
    }
    router.push(`/grants/${grant.id}/apply`);
  };

  const handleCancel = async () => {
    if (!canCancel) return;
    setIsProcessing(true);
    try {
      await cancelGrant({ grantId: grant.id });
      toast({
        title: 'Grant Cancelled Successfully',
        description:
          'The grant has been cancelled and is no longer accepting applications.',
      });
    } catch (error) {
      console.error('Failed to cancel grant:', error);
      toast({
        title: 'Failed to Cancel Grant',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusVariant = (status: typeof displayStatus) => {
    return grantUtils.getStatusBadgeVariant(status);
  };

  const getStatusIcon = (status: typeof displayStatus) => {
    switch (status) {
      case 'open':
        return <Users className="h-3 w-3" />;
      case 'closed':
        return <ExternalLink className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <Badge
          variant={getStatusVariant(displayStatus)}
          className="w-fit mx-auto flex items-center gap-1"
        >
          {getStatusIcon(displayStatus)}
          {grantUtils.getStatusText(displayStatus)}
        </Badge>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
            {grant.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {grant.shortDescription}
          </p>
        </div>

        <div className="space-y-4">
          {/* Reward and Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col items-center text-center">
              <DollarSign className="h-5 w-5 text-green-600 mb-1" />
              <span className="font-medium text-foreground">
                {grantUtils.formatReward(grant.reward)}
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Users className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-muted-foreground">
                {grant.applications.length} applications
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Award className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-muted-foreground">
                {grant.tranches.length} tranches
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-muted-foreground">
                {grantUtils.getRelativeTime(grant.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleViewDetails}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Details
            </Button>

            {isOwner && canCancel && (
              <Button
                onClick={handleCancel}
                disabled={isProcessing}
                variant="destructive"
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Cancel Grant'}
              </Button>
            )}

            {!isOwner && canApply && !hasUserApplied && (
              <Button
                onClick={handleApply}
                size="sm"
                className="w-full bg-green-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Award className="h-4 w-4 mr-1" />
                Apply
              </Button>
            )}

            {!isOwner && hasUserApplied && (
              <Button
                onClick={handleViewDetails}
                size="sm"
                variant="outline"
                className="w-full text-green-600 border-green-200 hover:bg-green-50"
              >
                View Application
              </Button>
            )}

            {!isOwner && isUserSelected && (
              <Button
                onClick={handleViewDetails}
                size="sm"
                className="w-full bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
              >
                Selected!
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
