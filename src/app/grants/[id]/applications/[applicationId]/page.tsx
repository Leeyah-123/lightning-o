'use client';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningInvoiceModal } from '@/components/ui/lightning-invoice-modal';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { formatOrdinal, normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { lightningService } from '@/services/lightning-service';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils, type Grant, type GrantApplication } from '@/types/grant';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface ApplicationDetailPageProps {
  params: Promise<{
    id: string;
    applicationId: string;
  }>;
}

export default function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { grants, init, fundTranche, reviewTranche, submitTranche } =
    useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [application, setApplication] = useState<GrantApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>('');
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedTrancheForSubmission, setSelectedTrancheForSubmission] =
    useState<string>('');
  const [submissionContent, setSubmissionContent] = useState<string>('');
  const [submissionLinks, setSubmissionLinks] = useState<string[]>(['']);
  const { id, applicationId } = use(params);

  // Check if user is the grant owner
  const userHexPubkey = user?.pubkey
    ? profileService.getHexFromNpub(user.pubkey)
    : undefined;
  const isOwner = grant && userHexPubkey === grant.sponsorPubkey;
  const isApplicant =
    application && userHexPubkey === application.applicantPubkey;

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (grants.length > 0) {
      const foundGrant = grants.find((g) => g.id === id);
      if (foundGrant) {
        setGrant(foundGrant);
        const foundApplication = foundGrant.applications.find(
          (app) => app.id === applicationId
        );
        if (foundApplication) {
          setApplication(foundApplication);
        }
      }
      setIsLoading(false);
    }
  }, [grants, id, applicationId]);

  // Set a timeout to stop loading after 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleFundTranche = async (trancheId: string) => {
    if (!grant || !application) return;

    setIsProcessing(true);
    try {
      const result = await fundTranche({
        grantId: grant.id,
        applicationId: application.id,
        trancheId: trancheId,
      });

      if (result.success && result.lightningInvoice) {
        const tranche = grant.tranches.find((t) => t.id === trancheId);
        if (!tranche) throw new Error('Tranche not found');

        setLightningInvoice(result.lightningInvoice);
        setPaymentHash(result.paymentHash || '');
        setFundingAmount(tranche.maxAmount || tranche.amount);
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
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDevPayment = async () => {
    if (!grant || !application || !paymentHash) return;

    const response = await fetch('/api/lightning/pay-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: lightningInvoice,
        reference: `dev-grant-payment-${grant.id}-${
          application.id
        }-${Date.now()}`,
        customerEmail: 'dev@lightning.app',
      }),
    });

    if (response.ok) {
      const eventData = {
        type: 'funded' as const,
        data: {
          entityType: 'grant' as const,
          grantId: grant.id,
          applicationId: application.id,
          paymentHash: paymentHash,
          amount: fundingAmount,
          paidAt: new Date().toISOString(),
          request: lightningInvoice,
          status: 'completed',
        },
      };
      lightningService.emitEvent(eventData);
      console.log(
        'Emitted funded event for grant application:',
        application.id
      );
    } else {
      throw new Error('Dev payment failed');
    }
  };

  const handleReviewTranche = async (
    trancheId: string,
    action: 'approve' | 'reject'
  ) => {
    if (!grant || !application) return;

    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = prompt('Please provide a reason for rejection:') || '';
      if (!rejectionReason) return;
    }

    setIsProcessing(true);
    try {
      await reviewTranche({
        grantId: grant.id,
        applicationId: application.id,
        trancheId: trancheId,
        action: action,
        rejectionReason: rejectionReason || undefined,
      });

      toast({
        title: `Tranche ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The tranche has been ${
          action === 'approve' ? 'approved' : 'rejected'
        } successfully.`,
      });
    } catch (error) {
      console.error(`Failed to ${action} tranche:`, error);
      toast({
        title: `Failed to ${
          action === 'approve' ? 'Approve' : 'Reject'
        } Tranche`,
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitTranche = async (trancheId: string) => {
    if (!grant || !application) return;

    setSelectedTrancheForSubmission(trancheId);
    setShowSubmissionModal(true);
  };

  const handleSubmitTrancheWork = async () => {
    if (!grant || !application || !selectedTrancheForSubmission) return;

    setIsProcessing(true);
    try {
      await submitTranche({
        grantId: grant.id,
        applicationId: application.id,
        trancheId: selectedTrancheForSubmission,
        content: submissionContent,
        links: submissionLinks.filter((link) => link.trim() !== ''),
      });

      toast({
        title: 'Work Submitted',
        description: 'Your work has been submitted for review.',
      });

      setShowSubmissionModal(false);
      setSubmissionContent('');
      setSubmissionLinks(['']);
    } catch (error) {
      console.error('Failed to submit work:', error);
      toast({
        title: 'Failed to Submit Work',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTrancheStatusIcon = (status: string) => {
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

  const getTrancheStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return grant && grant.selectedApplicationIds.length > 0
          ? 'Pending Funding'
          : 'Waiting for Applications';
      case 'funded':
        return 'Funded';
      case 'submitted':
        return 'Submitted for Review';
      case 'accepted':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const isApplicationCompleted = () => {
    if (!grant || !application) return false;
    return grant.tranches.every((tranche) => tranche.status === 'accepted');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner className="h-8 w-8 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Loading Application...
              </h3>
              <p className="text-muted-foreground">
                Fetching application details from the network
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!grant || !application) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The application you're looking for doesn't exist or has been
              removed.
            </p>
            <Link href={`/grants/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Grant
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isCompleted = isApplicationCompleted();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/grants/${grant.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Grant
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{grant.title}</h1>
              <p className="text-muted-foreground">Application Management</p>
            </div>
          </div>

          {/* Application Status */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Application Status
                  </h3>
                  <p className="text-muted-foreground">
                    Applicant:{' '}
                    {truncateMiddle(
                      normalizeToNpub(application.applicantPubkey),
                      8
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied:{' '}
                    {grantUtils.getRelativeTime(application.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-6 w-6" />
                      <span className="font-semibold">Completed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="h-6 w-6" />
                      <span className="font-semibold">In Progress</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.portfolioLink && (
                    <div>
                      <h4 className="font-medium mb-2">Portfolio Link</h4>
                      <a
                        href={application.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2"
                      >
                        {application.portfolioLink}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium mb-2">Proposal</h4>
                    <div
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: application.proposal }}
                    />
                  </div>
                  {application.budgetRequest && (
                    <div>
                      <h4 className="font-medium mb-2">Budget Request</h4>
                      <p className="text-lg font-semibold">
                        {application.budgetRequest.toLocaleString()} sats
                      </p>
                    </div>
                  )}
                </div>
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
                      <h4 className="font-medium">
                        {formatOrdinal(index + 1)} Tranche
                      </h4>
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

                    {/* Status */}
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tranche.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : tranche.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : tranche.status === 'submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : tranche.status === 'funded'
                            ? 'bg-green-100 text-green-800'
                            : tranche.status === 'pending' &&
                              grant.selectedApplicationIds.length > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tranche.status === 'pending' &&
                        grant.selectedApplicationIds.length === 0
                          ? 'Waiting for Applications'
                          : getTrancheStatusText(tranche.status)}
                      </span>
                    </div>

                    {/* Actions */}
                    {isOwner && tranche.status === 'pending' && (
                      <Button
                        onClick={() => handleFundTranche(tranche.id)}
                        size="sm"
                        className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                        disabled={isProcessing}
                      >
                        Fund Tranche
                      </Button>
                    )}

                    {isApplicant && tranche.status === 'funded' && (
                      <Button
                        onClick={() => handleSubmitTranche(tranche.id)}
                        size="sm"
                        className="bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
                        disabled={isProcessing}
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
                          disabled={isProcessing}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() =>
                            handleReviewTranche(tranche.id, 'reject')
                          }
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          disabled={isProcessing}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Submitted Work */}
                    {tranche.submittedContent && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Submitted Work:</h5>
                        <div
                          className="rich-text-content text-sm"
                          dangerouslySetInnerHTML={{
                            __html: tranche.submittedContent,
                          }}
                        />
                        {tranche.submittedLinks &&
                          tranche.submittedLinks.length > 0 && (
                            <div className="mt-2">
                              <h6 className="font-medium mb-1">Links:</h6>
                              <ul className="text-sm space-y-1">
                                {tranche.submittedLinks.map((link, idx) => (
                                  <li key={idx}>
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      {link}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Rejection Reason */}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Completion Status */}
            {isCompleted && (
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Application Completed!
                  </h3>
                  <p className="text-muted-foreground">
                    All tranches have been completed and approved.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Lightning Invoice Modal */}
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

      {/* Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Submit Work</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Work Description
                </label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6}
                  placeholder="Describe the work you've completed for this tranche..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Links (optional)
                </label>
                {submissionLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...submissionLinks];
                        newLinks[index] = e.target.value;
                        setSubmissionLinks(newLinks);
                      }}
                      className="flex-1 p-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://example.com"
                    />
                    {submissionLinks.length > 1 && (
                      <Button
                        onClick={() => {
                          const newLinks = submissionLinks.filter(
                            (_, i) => i !== index
                          );
                          setSubmissionLinks(newLinks);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => setSubmissionLinks([...submissionLinks, ''])}
                  variant="outline"
                  size="sm"
                >
                  Add Link
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSubmitTrancheWork}
                disabled={!submissionContent.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Submitting...' : 'Submit Work'}
              </Button>
              <Button
                onClick={() => {
                  setShowSubmissionModal(false);
                  setSubmissionContent('');
                  setSubmissionLinks(['']);
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
