'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningInvoiceModal } from '@/components/ui/lightning-invoice-modal';
import { useToast } from '@/lib/hooks/use-toast';
import { lightningService } from '@/services/lightning-service';
import { profileService } from '@/services/profile-service';
import { useGrants } from '@/store/grants';
import type { Grant } from '@/types/grant';
import { grantUtils } from '@/types/grant';
import { Award, Calendar, DollarSign, Users, X } from 'lucide-react';
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
  const { cancelGrant, fundTranche } = useGrants();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>('');

  const displayStatus = grantUtils.getDisplayStatus(grant);
  const canApply = grantUtils.canApply(grant);
  const canCancel = grantUtils.canCancel(grant);
  const isFirstTranchePaymentPending = grant.status === 'partially_active';
  const isActive = grantUtils.isActive(grant);

  // Check if current user has applied
  const hasUserApplied =
    currentUserPubkey &&
    grant.applications.some(
      (app) =>
        profileService.getHexFromNpub(currentUserPubkey) === app.applicantPubkey
    );

  // Check if current user is selected
  const isUserSelected =
    currentUserPubkey &&
    grant.selectedApplicationIds.some((appId) => {
      const application = grant.applications.find((app) => app.id === appId);
      return (
        application &&
        profileService.getHexFromNpub(currentUserPubkey) ===
          application.applicantPubkey
      );
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

  const handleFundFirstTranche = async () => {
    if (!isFirstTranchePaymentPending) return;
    setIsProcessing(true);
    try {
      const selectedApplication = grant.applications.find((app) =>
        grant.selectedApplicationIds.includes(app.id)
      );
      if (!selectedApplication) {
        throw new Error('No selected application found');
      }
      const firstTranche = grant.tranches.find((t) => t.status === 'pending');
      if (!firstTranche) {
        throw new Error('No pending tranche found');
      }
      const result = await fundTranche({
        grantId: grant.id,
        applicationId: selectedApplication.id,
        trancheId: firstTranche.id,
      });
      if (result.success && result.lightningInvoice) {
        setLightningInvoice(result.lightningInvoice);
        setPaymentHash(result.paymentHash || '');
        setFundingAmount(firstTranche.amountSats);
        setShowLightningModal(true);
      } else {
        throw new Error(result.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Failed to fund tranche:', error);
      toast({
        title: 'Failed to Fund Tranche',
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
    if (!grant || !paymentHash) return;
    const response = await fetch('/api/lightning/pay-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: lightningInvoice,
        reference: `dev-grant-payment-${grant.id}-${Date.now()}`,
        customerEmail: 'dev@lightning.app',
      }),
    });
    if (response.ok) {
      const eventData = {
        type: 'funded' as const,
        data: {
          entityType: 'grant' as const,
          grantId: grant.id,
          paymentHash: paymentHash,
          amount: fundingAmount,
          paidAt: new Date().toISOString(),
          request: lightningInvoice,
          status: 'completed',
        },
      };
      lightningService.emitEvent(eventData);
      console.log(
        'Emitted funded event for grant:',
        grant.id,
        'with paymentHash:',
        paymentHash
      );
    } else {
      throw new Error('Dev payment failed');
    }
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 border-0 bg-white/50 dark:bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                {grant.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {grant.shortDescription}
              </p>
            </div>
            <Badge
              variant={grantUtils.getStatusBadgeVariant(displayStatus)}
              className="ml-2 shrink-0"
            >
              {grantUtils.getStatusText(displayStatus)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Reward and Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    {grantUtils.formatReward(grant.reward)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{grant.applications.length} applications</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{grantUtils.getRelativeTime(grant.createdAt)}</span>
              </div>
            </div>

            {/* Tranches */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                Tranches:
              </div>
              <div className="space-y-1">
                {grant.tranches.slice(0, 3).map((tranche, index) => (
                  <div
                    key={tranche.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {index + 1}. {tranche.description}
                    </span>
                    <span className="font-medium">
                      {tranche.amountSats.toLocaleString()} sats
                    </span>
                  </div>
                ))}
                {grant.tranches.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    +{grant.tranches.length - 3} more tranches
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleViewDetails}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                View Details
              </Button>

              {isOwner && canCancel && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {isOwner && isFirstTranchePaymentPending && (
                <Button
                  onClick={handleFundFirstTranche}
                  size="sm"
                  disabled={isProcessing}
                  className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Fund First Tranche
                </Button>
              )}

              {!isOwner && canApply && !hasUserApplied && (
                <Button
                  onClick={handleApply}
                  size="sm"
                  className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
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
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  View Application
                </Button>
              )}

              {!isOwner && isUserSelected && (
                <Button
                  onClick={handleViewDetails}
                  size="sm"
                  className="bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Selected!
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LightningInvoiceModal
        isOpen={showLightningModal}
        onClose={() => setShowLightningModal(false)}
        lightningInvoice={lightningInvoice}
        amountSats={fundingAmount}
        title="Fund Grant Tranche"
        description="for the first tranche"
        onDevPayment={handleDevPayment}
        onPaymentComplete={() => {
          setShowLightningModal(false);
          // The grant will be updated via webhook
        }}
      />
    </>
  );
}
