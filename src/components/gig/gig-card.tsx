'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningInvoiceModal } from '@/components/ui/lightning-invoice-modal';
import { useToast } from '@/lib/hooks/use-toast';
import { normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { lightningService } from '@/services/lightning-service';
import { useGigs } from '@/store/gigs';
import type { Gig } from '@/types/gig';
import { gigUtils } from '@/types/gig';
import {
  Briefcase,
  Calendar,
  DollarSign,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GigCardProps {
  gig: Gig;
  isOwner: boolean;
  isLoading?: boolean;
  currentUserPubkey?: string;
}

export function GigCard({
  gig,
  isOwner,
  isLoading = false,
  currentUserPubkey,
}: GigCardProps) {
  const router = useRouter();
  const { cancelGig, fundMilestone } = useGigs();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>('');

  const displayStatus = gigUtils.getDisplayStatus(gig);
  const canApply = gigUtils.canApply(gig);
  const canCancel = gigUtils.canCancel(gig);
  const isFirstMilestonePaymentPending =
    gigUtils.isFirstMilestonePaymentPending(gig);
  const isInProgress = gigUtils.isInProgress(gig);

  // Check if current user has applied
  const hasUserApplied =
    currentUserPubkey &&
    gig.applications.some((app) => app.applicantPubkey === currentUserPubkey);

  // Check if current user is the selected applicant
  const isUserSelected =
    currentUserPubkey &&
    gig.selectedApplicationId &&
    gig.applications.find((app) => app.id === gig.selectedApplicationId)
      ?.applicantPubkey === currentUserPubkey;

  const getStatusVariant = (status: typeof displayStatus) => {
    return gigUtils.getStatusBadgeVariant(status);
  };

  const getStatusIcon = (status: typeof displayStatus) => {
    switch (status) {
      case 'open':
        return <Briefcase className="h-3 w-3" />;
      case 'application_selected':
        return <Users className="h-3 w-3" />;
      case 'in_progress':
        return <Calendar className="h-3 w-3" />;
      case 'completed':
        return <DollarSign className="h-3 w-3" />;
      case 'cancelled':
        return <ExternalLink className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleApply = () => {
    router.push(`/gigs/${gig.id}/apply`);
  };

  const handleViewDetails = () => {
    router.push(`/gigs/${gig.id}`);
  };

  const handleViewApplications = () => {
    router.push(`/gigs/${gig.id}/applications`);
  };

  const handleCancel = async () => {
    if (!canCancel) return;
    setIsProcessing(true);
    try {
      await cancelGig({ gigId: gig.id });
      toast({
        title: 'Gig Cancelled Successfully',
        description:
          'The gig has been cancelled and is no longer accepting applications.',
      });
    } catch (error) {
      console.error('Failed to cancel gig:', error);
      toast({
        title: 'Failed to Cancel Gig',
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

  const handleFundFirstMilestone = async () => {
    if (!isFirstMilestonePaymentPending) return;
    setIsProcessing(true);

    try {
      // Find the first pending milestone
      const selectedApplication = gig.applications.find(
        (app) => app.id === gig.selectedApplicationId
      );
      if (!selectedApplication) {
        throw new Error('No selected application found');
      }

      const firstMilestone = selectedApplication.milestones.find(
        (m) => m.status === 'pending'
      );
      if (!firstMilestone) {
        throw new Error('No pending milestone found');
      }

      const result = await fundMilestone({
        gigId: gig.id,
        milestoneId: firstMilestone.id,
      });

      if (result.success && result.lightningInvoice) {
        setLightningInvoice(result.lightningInvoice);
        setPaymentHash(result.paymentHash || '');
        setFundingAmount(firstMilestone.amountSats);
        setShowLightningModal(true);
      } else {
        throw new Error(result.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Failed to fund milestone:', error);
      toast({
        title: 'Failed to Fund Milestone',
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

  const handleDevPayment = async () => {
    if (!gig || !paymentHash) return;

    // Simulate payment by calling the pay invoice API
    const response = await fetch('/api/lightning/pay-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: lightningInvoice,
        reference: `dev-gig-payment-${gig.id}-${Date.now()}`,
        customerEmail: 'dev@lightning.app',
      }),
    });

    if (response.ok) {
      // Emit the funded event with the correct paymentHash
      const eventData = {
        type: 'funded' as const,
        data: {
          entityType: 'gig' as const,
          gigId: gig.id,
          paymentHash: paymentHash,
          amount: fundingAmount,
          paidAt: new Date().toISOString(),
          request: lightningInvoice,
          status: 'completed',
        },
      };

      lightningService.emitEvent(eventData);
      console.log(
        'Emitted funded event for gig:',
        gig.id,
        'with paymentHash:',
        paymentHash
      );
    } else {
      throw new Error('Dev payment failed');
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {gig.title}
            </CardTitle>
            {isUserSelected && (
              <Badge
                variant="default"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 text-xs flex-shrink-0"
              >
                🎯 Selected
              </Badge>
            )}
          </div>
          <Badge
            variant={getStatusVariant(displayStatus)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(displayStatus)}
            {gigUtils.getStatusText(displayStatus).toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-3 leading-relaxed">
          {gig.shortDescription}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {gig.budgetRange && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium">
                    {gigUtils.formatBudget(gig.budgetRange)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  Sponsor:{' '}
                  {truncateMiddle(normalizeToNpub(gig.sponsorPubkey), 6, 4)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Posted {gigUtils.getRelativeTime(gig.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>
                {gig.applications.length} application
                {gig.applications.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Status-specific information */}
        {isFirstMilestonePaymentPending && (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
            <strong>Awaiting first milestone payment</strong>
            {isUserSelected && (
              <p className="mt-1">
                You've been selected! Awaiting sponsor payment for the first
                milestone.
              </p>
            )}
          </div>
        )}

        {isInProgress && isUserSelected && (
          <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <strong>Gig in progress</strong>
            <p className="mt-1">
              Work on your milestones and submit them for review.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>

          {isOwner && gig.applications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewApplications}
            >
              <Users className="h-4 w-4 mr-2" />
              Applications ({gig.applications.length})
            </Button>
          )}
        </div>

        {/* Action buttons based on status and user role */}
        {!isOwner && canApply && !hasUserApplied && (
          <Button
            onClick={handleApply}
            disabled={isLoading || isProcessing}
            className="w-full bg-blue-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading || isProcessing ? 'Processing...' : 'Apply to Gig'}
          </Button>
        )}

        {!isOwner && hasUserApplied && (
          <div className="text-center text-sm text-muted-foreground p-2 bg-muted/50 rounded">
            You have applied to this gig
          </div>
        )}

        {isOwner && canCancel && (
          <Button
            onClick={handleCancel}
            disabled={isLoading || isProcessing}
            variant="destructive"
            className="w-full"
          >
            {isLoading || isProcessing ? 'Processing...' : 'Cancel Gig'}
          </Button>
        )}

        {isOwner && isFirstMilestonePaymentPending && (
          <Button
            onClick={handleFundFirstMilestone}
            disabled={isLoading || isProcessing}
            className="w-full bg-green-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isLoading || isProcessing
              ? 'Processing...'
              : 'Fund First Milestone'}
          </Button>
        )}
      </CardContent>

      {/* Lightning Invoice Modal */}
      <LightningInvoiceModal
        isOpen={showLightningModal}
        onClose={() => setShowLightningModal(false)}
        lightningInvoice={lightningInvoice}
        amountSats={fundingAmount}
        title="Fund Gig Milestone"
        description="for the first milestone"
        onDevPayment={handleDevPayment}
        onPaymentComplete={() => {
          setShowLightningModal(false);
          // The gig will be updated via webhook
        }}
      />
    </Card>
  );
}
