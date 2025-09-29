'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningInvoiceModal } from '@/components/ui/lightning-invoice-modal';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { lightningService } from '@/services/lightning-service';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils, type Grant } from '@/types/grant';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  DollarSign,
  ExternalLink,
  FileText,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface GrantDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GrantDetailPage({ params }: GrantDetailPageProps) {
  const {
    grants,
    init,
    fundTranche,
    selectApplication,
    submitTranche,
    reviewTranche,
  } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>('');
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>('');
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('');
  const { id } = use(params);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (id && grants.length > 0) {
      const foundGrant = grants.find((g) => g.id === id);
      setGrant(foundGrant || null);
      setIsLoading(false);
    } else if (id && grants.length === 0) {
      // Still loading grants
      setIsLoading(true);
    }
  }, [id, grants]);

  // Set a timeout to stop loading after 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Grant...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching grant details from the network
          </p>
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Grant not found</h1>
            <p className="text-muted-foreground mb-4">
              The grant you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/grants">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Grants
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userHexPubkey = user?.pubkey
    ? profileService.getHexFromNpub(user.pubkey)
    : undefined;
  const isOwner = userHexPubkey === grant.sponsorPubkey;
  const hasUserApplied =
    userHexPubkey &&
    grant.applications.some(
      (app) =>
        profileService.getHexFromNpub(userHexPubkey) === app.applicantPubkey
    );
  const isUserSelected =
    userHexPubkey &&
    grant.selectedApplicationIds.some((appId) => {
      const application = grant.applications.find((app) => app.id === appId);
      return (
        application &&
        profileService.getHexFromNpub(userHexPubkey) ===
          application.applicantPubkey
      );
    });

  const displayStatus = grantUtils.getDisplayStatus(grant);
  const canApply =
    grantUtils.canApply(grant) &&
    !hasUserApplied &&
    !isUserSelected &&
    !isOwner;

  const handleApply = () => {
    if (!user) {
      const connectButton = document.querySelector(
        '[data-connect-wallet]'
      ) as HTMLButtonElement;
      connectButton?.click();
      return;
    }
    router.push(`/grants/${grant.id}/apply`);
  };

  const handleSelectApplication = async (applicationId: string) => {
    if (!isOwner) return;

    try {
      await selectApplication({
        grantId: grant.id,
        applicationId,
      });
      toast({
        title: 'Application Selected',
        description: 'The application has been selected successfully.',
      });
    } catch (error) {
      console.error('Failed to select application:', error);
      toast({
        title: 'Failed to Select Application',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleFundTranche = async (
    applicationId: string,
    trancheId: string
  ) => {
    if (!isOwner) return;

    try {
      const result = await fundTranche({
        grantId: grant.id,
        applicationId,
        trancheId,
      });

      if (result.success && result.lightningInvoice) {
        setLightningInvoice(result.lightningInvoice);
        setPaymentHash(result.paymentHash || '');
        setFundingAmount(
          grant.tranches.find((t) => t.id === trancheId)?.maxAmount ||
            grant.tranches.find((t) => t.id === trancheId)?.amount ||
            0
        );
        setSelectedApplicationId(applicationId);
        setSelectedTrancheId(trancheId);
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
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitTranche = async (trancheId: string) => {
    if (!isUserSelected) return;

    const content = prompt('Describe your work for this tranche:');
    if (!content) return;

    try {
      const selectedApp = grant.applications.find(
        (app) =>
          grant.selectedApplicationIds.includes(app.id) &&
          profileService.getHexFromNpub(user!.pubkey) === app.applicantPubkey
      );

      if (!selectedApp) throw new Error('No selected application found');

      await submitTranche({
        grantId: grant.id,
        applicationId: selectedApp.id,
        trancheId,
        content,
      });

      toast({
        title: 'Tranche Submitted',
        description: 'Your work has been submitted for review.',
      });
    } catch (error) {
      console.error('Failed to submit tranche:', error);
      toast({
        title: 'Failed to Submit Tranche',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleReviewTranche = async (
    trancheId: string,
    action: 'approve' | 'reject'
  ) => {
    if (!isOwner) return;

    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = prompt('Please provide a reason for rejection:') || '';
      if (!rejectionReason) return;
    }

    try {
      const selectedApp = grant.applications.find((app) =>
        grant.selectedApplicationIds.includes(app.id)
      );

      if (!selectedApp) throw new Error('No selected application found');

      await reviewTranche({
        grantId: grant.id,
        applicationId: selectedApp.id,
        trancheId,
        action,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      });

      toast({
        title: action === 'approve' ? 'Tranche Approved' : 'Tranche Rejected',
        description:
          action === 'approve'
            ? 'The tranche has been approved and payment sent.'
            : 'The tranche has been rejected.',
      });
    } catch (error) {
      console.error('Failed to review tranche:', error);
      toast({
        title: 'Failed to Review Tranche',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
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

  const getTrancheStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'funded':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/grants">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grants
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold">{grant.title}</h1>
                <Badge
                  variant={grantUtils.getStatusBadgeVariant(displayStatus)}
                >
                  {grantUtils.getStatusText(displayStatus)}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {grant.shortDescription}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>{grantUtils.formatReward(grant.reward)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{grant.applications.length} applications</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{grantUtils.getRelativeTime(grant.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Grant Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="rich-text-content"
                  dangerouslySetInnerHTML={{ __html: grant.description }}
                />
              </CardContent>
            </Card>

            {/* Tranches */}
            <Card>
              <CardHeader>
                <CardTitle>Tranches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {grant.tranches.map((tranche, index) => (
                  <div key={tranche.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Tranche {index + 1}</h4>
                      <div className="flex items-center gap-2">
                        {getTrancheStatusIcon(tranche.status)}
                        <span className="text-sm font-medium">
                          {grantUtils.formatTrancheAmount(tranche)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="rich-text-content mb-3"
                      dangerouslySetInnerHTML={{ __html: tranche.description }}
                    />

                    {/* Tranche Actions */}
                    {isOwner && tranche.status === 'pending' && (
                      <Button
                        onClick={() => {
                          const selectedApp = grant.applications.find((app) =>
                            grant.selectedApplicationIds.includes(app.id)
                          );
                          if (selectedApp) {
                            handleFundTranche(selectedApp.id, tranche.id);
                          }
                        }}
                        size="sm"
                        className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        Fund Tranche
                      </Button>
                    )}

                    {isUserSelected && tranche.status === 'funded' && (
                      <Button
                        onClick={() => handleSubmitTranche(tranche.id)}
                        size="sm"
                        className="bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
                      >
                        Submit Work
                      </Button>
                    )}

                    {isOwner && tranche.status === 'submitted' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleReviewTranche(tranche.id, 'approve')
                          }
                          size="sm"
                          className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() =>
                            handleReviewTranche(tranche.id, 'reject')
                          }
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {tranche.submittedContent && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Submitted Work:</h5>
                        <p className="text-sm">{tranche.submittedContent}</p>
                        {tranche.submittedLinks &&
                          tranche.submittedLinks.length > 0 && (
                            <div className="mt-2">
                              <h6 className="font-medium text-sm mb-1">
                                Links:
                              </h6>
                              {tranche.submittedLinks.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline mr-2"
                                >
                                  <ExternalLink className="h-3 w-3 inline mr-1" />
                                  Link {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                      </div>
                    )}

                    {tranche.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">
                          Rejection Reason:
                        </h5>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {tranche.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Applications */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Applications ({grant.applications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {grant.applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">Application</span>
                          {application.status === 'selected' && (
                            <Badge variant="success">Selected</Badge>
                          )}
                          {application.status === 'rejected' && (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Applied{' '}
                          {grantUtils.getRelativeTime(application.submittedAt)}
                        </div>
                      </div>
                      {isOwner && application.status === 'pending' && (
                        <Button
                          onClick={() =>
                            handleSelectApplication(application.id)
                          }
                          size="sm"
                          className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          Select
                        </Button>
                      )}
                    </div>

                    <div
                      className="prose prose-sm max-w-none dark:prose-invert mb-3"
                      dangerouslySetInnerHTML={{ __html: application.proposal }}
                    />

                    {application.portfolioLink && (
                      <a
                        href={application.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 inline mr-1" />
                        Portfolio
                      </a>
                    )}
                  </div>
                ))}

                {grant.applications.length > 5 && (
                  <div className="text-center">
                    <Button variant="outline">
                      View All Applications ({grant.applications.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            {canApply && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Button
                    onClick={handleApply}
                    size="lg"
                    className="w-full bg-green-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Award className="h-5 w-5 mr-2" />
                    Apply for Grant
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Selected Applicant Status */}
            {isUserSelected && (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-green-600 dark:text-green-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">You've been selected!</p>
                    <p className="text-sm">
                      {grant.tranches.some((t) => t.status === 'funded')
                        ? 'You can start working on funded tranches.'
                        : 'Awaiting sponsor payment for the first tranche.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grant Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Grant Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Funding</span>
                  <span className="font-medium">
                    {grantUtils.formatReward(grant.reward)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tranches</span>
                  <span className="font-medium">{grant.tranches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">
                    {grant.applications.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected</span>
                  <span className="font-medium">
                    {grant.selectedApplicationIds.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <LightningInvoiceModal
        isOpen={showLightningModal}
        onClose={() => setShowLightningModal(false)}
        lightningInvoice={lightningInvoice}
        amountSats={fundingAmount}
        title="Fund Grant Tranche"
        description="for the selected tranche"
        onDevPayment={handleDevPayment}
        onPaymentComplete={() => {
          setShowLightningModal(false);
        }}
      />
    </>
  );
}
