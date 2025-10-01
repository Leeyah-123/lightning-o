'use client';

import { LoginModal } from '@/components/auth/login-modal';
import { MilestoneReviewModal } from '@/components/gig/milestone-review-modal';
import { MilestoneSubmissionModal } from '@/components/gig/milestone-submission-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningInvoiceModal } from '@/components/ui/lightning-invoice-modal';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { lightningService } from '@/services/lightning-service';
import { useAuth } from '@/store/auth';
import { useGigs } from '@/store/gigs';
import {
  gigUtils,
  type Gig,
  type GigApplication,
  type GigMilestone,
} from '@/types/gig';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface GigDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GigDetailPage({ params }: GigDetailPageProps) {
  const { gigs, init, fundMilestone } = useGigs();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMilestoneSubmissionModal, setShowMilestoneSubmissionModal] =
    useState(false);
  const [showMilestoneReviewModal, setShowMilestoneReviewModal] =
    useState(false);
  const [selectedMilestone, setSelectedMilestone] =
    useState<GigMilestone | null>(null);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (id && gigs.length > 0) {
      const foundGig = gigs.find((g) => g.id === id);
      setGig(foundGig || null);
      setIsLoading(false);
    } else if (id && gigs.length === 0) {
      // Still loading gigs
      setIsLoading(true);
    }
  }, [id, gigs]);

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
          <h1 className="text-2xl font-bold mb-4">Loading Gig...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching gig details from the network
          </p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="container min-h-screen mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Gig not found</h1>
          <p className="text-muted-foreground mb-4">
            The gig you&apos;re looking for might still be loading from the
            network. This can happen if you just created the gig or refreshed
            the page.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => init()}>
              <Zap className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
            <Link href="/gigs">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gigs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.pubkey === gig.sponsorPubkey;
  const hasUserApplied =
    user?.pubkey &&
    gig.applications.some(
      (app: GigApplication) => app.applicantPubkey === user.pubkey
    );
  const isUserSelected =
    user?.pubkey &&
    gig.selectedApplicationId &&
    gig.applications.find(
      (app: GigApplication) => app.id === gig.selectedApplicationId
    )?.applicantPubkey === user.pubkey;

  const displayStatus = gigUtils.getDisplayStatus(gig);
  const canApply = gigUtils.canApply(gig);
  const canCancel = gigUtils.canCancel(gig);

  const selectedApplication = gig.selectedApplicationId
    ? gig.applications.find(
        (app: GigApplication) => app.id === gig.selectedApplicationId
      )
    : null;

  const getStatusIcon = (status: typeof displayStatus) => {
    switch (status) {
      case 'open':
        return <Briefcase className="h-4 w-4" />;
      case 'application_selected':
        return <Users className="h-4 w-4" />;
      case 'in_progress':
        return <Calendar className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'funded':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleApply = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/gigs/${gig.id}/apply`);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    router.push(`/gigs/${gig.id}/apply`);
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
    } else {
      throw new Error('Dev payment failed');
    }
  };

  const handleViewApplications = () => {
    router.push(`/gigs/${gig.id}/applications`);
  };

  const handleSubmitMilestone = (milestone: GigMilestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneSubmissionModal(true);
  };

  const handleReviewMilestone = (milestone: GigMilestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneReviewModal(true);
  };

  const handleFundMilestone = async (milestone: GigMilestone) => {
    if (!gig) return;

    try {
      const result = await fundMilestone({
        gigId: gig.id,
        milestoneId: milestone.id,
      });
      if (result.success && result.lightningInvoice) {
        setLightningInvoice(result.lightningInvoice);
        setPaymentHash(result.paymentHash || '');
        setFundingAmount(milestone.amountSats);
        setShowLightningModal(true);
      } else {
        toast({
          title: 'Funding Failed',
          description: result.error || 'Failed to create Lightning invoice',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Funding Error',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/gigs">
            <Button variant="outline" className="p-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gigs
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gig Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-2xl">{gig.title}</CardTitle>
                      <p className="text-muted-foreground mt-2 text-lg">
                        {gig.shortDescription}
                      </p>
                      <div className="flex flex-col items-start gap-2 mt-3">
                        <Badge
                          variant={gigUtils.getStatusBadgeVariant(
                            displayStatus
                          )}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(displayStatus)}
                          {gigUtils.getStatusText(displayStatus)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Posted {gigUtils.getRelativeTime(gig.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="rich-text-content"
                  dangerouslySetInnerHTML={{ __html: gig.description }}
                />
              </CardContent>
            </Card>

            {/* Milestones (if application is selected) */}
            {selectedApplication && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedApplication.milestones.map(
                      (milestone: GigMilestone, index: number) => (
                        <div
                          key={milestone.id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Milestone {index + 1}
                              </span>
                              {getMilestoneStatusIcon(milestone.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span className="font-medium">
                                {milestone.amountSats.toLocaleString()} sats
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {milestone.description}
                          </p>

                          {milestone.status === 'submitted' &&
                            milestone.submittedContent && (
                              <div className="mb-3 p-3 bg-muted/50 rounded">
                                <p className="text-sm font-medium mb-2">
                                  Submitted Work:
                                </p>
                                <div
                                  className="rich-text-content"
                                  dangerouslySetInnerHTML={{
                                    __html: milestone.submittedContent,
                                  }}
                                />
                                {milestone.submittedLightningAddress && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-mono">
                                      {milestone.submittedLightningAddress}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                          {milestone.rejectionReason && (
                            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                                Rejection Reason:
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                {milestone.rejectionReason}
                              </p>
                            </div>
                          )}

                          {/* Action buttons */}
                          {isUserSelected && milestone.status === 'funded' && (
                            <Button
                              onClick={() => handleSubmitMilestone(milestone)}
                              size="sm"
                              className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                            >
                              Submit Work
                            </Button>
                          )}

                          {isOwner && milestone.status === 'pending' && (
                            <Button
                              onClick={() => handleFundMilestone(milestone)}
                              size="sm"
                              className="bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
                            >
                              Fund Milestone
                            </Button>
                          )}

                          {isOwner && milestone.status === 'submitted' && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReviewMilestone(milestone)}
                                size="sm"
                                variant="outline"
                              >
                                Review Submission
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gig Info */}
            <Card>
              <CardHeader>
                <CardTitle>Gig Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gig.budgetRange && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {gigUtils.isSingleAmount(gig.budgetRange)
                          ? 'Budget'
                          : 'Budget Range'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {gigUtils.formatBudget(gig.budgetRange)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Applications</p>
                    <p className="text-sm text-muted-foreground">
                      {gig.applications.length} application
                      {gig.applications.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Sponsor</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {truncateMiddle(normalizeToNpub(gig.sponsorPubkey), 8, 8)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent>
                <div className="space-y-3">
                  {!isOwner && canApply && !hasUserApplied && (
                    <Button
                      onClick={handleApply}
                      className="w-full bg-blue-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Apply to Gig
                    </Button>
                  )}

                  {!isOwner && hasUserApplied && (
                    <div className="text-center text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                      You have applied to this gig
                    </div>
                  )}

                  {isOwner && gig.applications.length > 0 && (
                    <Button
                      onClick={handleViewApplications}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Applications ({gig.applications.length})
                    </Button>
                  )}

                  {isOwner && canCancel && (
                    <Button variant="destructive" className="w-full">
                      Cancel Gig
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Messages */}
            {isUserSelected && selectedApplication && (
              <Card>
                <CardContent>
                  <div className="text-center text-amber-600 dark:text-amber-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">You&apos;ve been selected!</p>
                    <p className="text-sm">
                      {selectedApplication.milestones.some(
                        (m) => m.status === 'pending'
                      )
                        ? 'Awaiting sponsor payment for the next milestone.'
                        : 'All milestones have been funded. You can start working on funded milestones.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedMilestone && (
        <MilestoneSubmissionModal
          isOpen={showMilestoneSubmissionModal}
          onClose={() => {
            setShowMilestoneSubmissionModal(false);
            setSelectedMilestone(null);
          }}
          gigId={gig.id}
          milestoneId={selectedMilestone.id}
          milestoneAmount={selectedMilestone.amountSats}
          milestoneDescription={selectedMilestone.description}
        />
      )}

      {selectedMilestone && (
        <MilestoneReviewModal
          isOpen={showMilestoneReviewModal}
          onClose={() => {
            setShowMilestoneReviewModal(false);
            setSelectedMilestone(null);
          }}
          gigId={gig.id}
          milestoneId={selectedMilestone.id}
          milestoneAmount={selectedMilestone.amountSats}
          milestoneDescription={selectedMilestone.description}
          submittedContent={selectedMilestone.submittedContent || ''}
          submittedLightningAddress={
            selectedMilestone.submittedLightningAddress || ''
          }
          submittedAt={selectedMilestone.submittedAt || 0}
        />
      )}

      <LightningInvoiceModal
        isOpen={showLightningModal}
        onClose={() => setShowLightningModal(false)}
        lightningInvoice={lightningInvoice}
        amountSats={fundingAmount}
        title="Fund Gig Milestone"
        description="for the selected milestone"
        onDevPayment={handleDevPayment}
        onPaymentComplete={() => {
          setShowLightningModal(false);
          // The gig will be updated via webhook
        }}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
