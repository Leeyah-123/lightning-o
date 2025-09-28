'use client';

import { LightningInvoiceModal } from '@/components/bounty/LightningInvoiceModal';
import { SubmissionModal } from '@/components/bounty/SubmissionModal';
import { SubmissionsList } from '@/components/bounty/SubmissionsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { NostrAddresses } from '@/components/ui/NostrAddresses';
import { areKeysEqual, normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { validationUtils } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import type { Bounty, BountyDisplayStatus } from '@/types/bounty';
import { bountyUtils } from '@/types/bounty';
import { ArrowLeft, Award, Calendar, Clock, Users, Zap } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BountyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { bounties, init, fundBounty, completeBounty } = useBounties();
  const { user } = useAuth();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (params.id && bounties.length > 0) {
      const foundBounty = bounties.find((b) => b.id === params.id);
      setBounty(foundBounty || null);
      setIsLoading(false);
    } else if (params.id && bounties.length === 0) {
      // Still loading bounties
      setIsLoading(true);
    }
  }, [params.id, bounties]);

  // Set a timeout to stop loading after 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleFund = async () => {
    if (!bounty) return;
    setIsProcessing(true);
    try {
      const result = await fundBounty(bounty.id);
      if (result.success && result.lightningInvoice) {
        setLightningInvoice(result.lightningInvoice);
        setFundingAmount(validationUtils.getTotalReward(bounty.rewardSats));
        setShowLightningModal(true);
      } else {
        console.error('Funding failed:', result.error);
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error('Funding error:', error);
      // You might want to show an error message to the user
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async (selectedSubmissionIds: string[]) => {
    if (!bounty) return;
    setIsProcessing(true);
    try {
      await completeBounty(bounty.id, selectedSubmissionIds);
    } finally {
      setIsProcessing(false);
    }
  };

  const canSelectWinners = () => {
    if (!bounty) return false;
    return bountyUtils.canJudge(bounty);
  };

  const displayStatus = bounty
    ? bountyUtils.getDisplayStatus(bounty)
    : 'pending';
  const canSubmit = bounty ? bountyUtils.canSubmit(bounty) : false;

  // Check if current user has already submitted to this bounty
  const hasUserSubmitted =
    bounty &&
    user &&
    bounty.submissions?.some((submission) => submission.pubkey === user.pubkey);

  // Get user's submission if they have one
  const userSubmission =
    bounty && user
      ? bounty.submissions?.find(
          (submission) => submission.pubkey === user.pubkey
        )
      : null;

  // Check if current user is a winner
  const isUserWinner =
    bounty &&
    user &&
    bounty.winners?.some((winner) => winner.pubkey === user.pubkey);

  // Get user's winner info if they won
  const userWinnerInfo =
    bounty && user
      ? bounty.winners?.find((winner) => winner.pubkey === user.pubkey)
      : null;

  const getStatusVariant = (status: BountyDisplayStatus) => {
    return bountyUtils.getStatusBadgeVariant(status);
  };

  const getStatusIcon = (status: BountyDisplayStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'open':
        return <Zap className="h-4 w-4" />;
      case 'closed':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <Award className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Bounty...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching bounty details from the network
          </p>
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bounty Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The bounty you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/bounties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Button>
        </div>
      </div>
    );
  }

  const isOwner =
    user?.pubkey && bounty.sponsorPubkey
      ? areKeysEqual(user.pubkey, bounty.sponsorPubkey)
      : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/bounties')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Button>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl font-bold">
                      {bounty.title}
                    </CardTitle>
                    {isUserWinner && (
                      <Badge
                        variant="default"
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1"
                      >
                        🏆 Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <Badge
                      variant={getStatusVariant(displayStatus)}
                      className="flex items-center gap-2 text-sm"
                    >
                      {getStatusIcon(displayStatus)}
                      {bountyUtils.getStatusText(displayStatus).toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-1 text-lg font-semibold text-yellow-600">
                      <Zap className="h-5 w-5" />
                      {validationUtils
                        .getTotalReward(bounty.rewardSats)
                        .toLocaleString()}{' '}
                      sats
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Short Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {bounty.shortDescription}
              </p>
            </CardContent>
          </Card>

          {/* Detailed Description */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Detailed Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: bounty.description }}
              />
            </CardContent>
          </Card>

          {/* Winners Display/Reward Distribution */}
          {bounty.winners && bounty.winners.length > 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Winners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bounty.winners
                    .sort((a, b) => a.rank - b.rank)
                    .map((winner, index) => (
                      <div
                        key={winner.pubkey}
                        className={`p-4 rounded-lg border ${
                          isUserWinner && winner.pubkey === user?.pubkey
                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">
                                {winner.rank === 1
                                  ? '🥇'
                                  : winner.rank === 2
                                  ? '🥈'
                                  : winner.rank === 3
                                  ? '🥉'
                                  : '🏆'}
                              </span>
                              <span className="font-semibold">
                                {winner.rank}
                                {winner.rank === 1
                                  ? 'st'
                                  : winner.rank === 2
                                  ? 'nd'
                                  : winner.rank === 3
                                  ? 'rd'
                                  : 'th'}{' '}
                                Place
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <NostrAddresses pubkey={winner.pubkey} copy />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-yellow-600">
                              {winner.amountSats.toLocaleString()} sats
                            </div>
                            {isUserWinner && winner.pubkey === user?.pubkey && (
                              <div className="text-xs text-yellow-600 font-medium">
                                You won!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Reward Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {validationUtils.isMultiTierReward(bounty.rewardSats) ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Total Reward:{' '}
                      <span className="font-semibold">
                        {validationUtils
                          .getTotalReward(bounty.rewardSats)
                          .toLocaleString()}{' '}
                        sats
                      </span>
                    </p>
                    <div className="space-y-2">
                      {validationUtils
                        .getRewardTiers(bounty.rewardSats)
                        .map((reward, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">
                                {index + 1}
                                {index === 0
                                  ? 'st'
                                  : index === 1
                                  ? 'nd'
                                  : index === 2
                                  ? 'rd'
                                  : 'th'}{' '}
                                Place
                              </span>
                            </div>
                            <span className="font-semibold text-yellow-600">
                              {reward.toLocaleString()} sats
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Single Winner</span>
                    </div>
                    <span className="font-semibold text-yellow-600">
                      {validationUtils
                        .getTotalReward(bounty.rewardSats)
                        .toLocaleString()}{' '}
                      sats
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">
                      Submission Deadline
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(bounty.submissionDeadline).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Judging Deadline</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(bounty.judgingDeadline).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sponsor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sponsor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-sm">
                  {truncateMiddle(
                    normalizeToNpub(bounty.sponsorPubkey),
                    12,
                    12
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Escrow Info */}
          {bounty.escrowTxId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Escrow Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <code className="text-sm font-mono">{bounty.escrowTxId}</code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submissions - Only show to owner */}
          {isOwner && bounty.submissions && bounty.submissions.length > 0 && (
            <SubmissionsList
              submissions={bounty.submissions}
              bountyId={bounty.id}
              submissionDeadline={bounty.submissionDeadline}
              rewardSats={bounty.rewardSats}
              onSelectWinners={handleComplete}
              isOwner={isOwner}
              isProcessing={isProcessing}
              bountyStatus={bounty.status}
            />
          )}

          {/* Actions */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {bounty.status === 'pending' && (
                    <Button
                      onClick={handleFund}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isProcessing ? (
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Fund Bounty
                    </Button>
                  )}

                  {bounty.status === 'open' && canSelectWinners() ? (
                    <p>Select winners from the submissions list above</p>
                  ) : (
                    <div className="mt-4 text-sm text-muted-foreground">
                      {Date.now() < bounty.submissionDeadline ? (
                        <p>
                          Cannot select winners until submission deadline
                          passes.
                        </p>
                      ) : (
                        <p>No submissions available to judge.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Winner Status for Completed Bounties */}
          {bounty.status === 'completed' && !isOwner && isUserWinner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  🎉 You Won This Bounty!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                        🏆 Winner!
                      </span>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Congratulations! You won this bounty and received{' '}
                      <span className="font-bold">
                        {userWinnerInfo?.amountSats.toLocaleString()} sats
                      </span>
                      {userWinnerInfo?.rank && (
                        <span className="block mt-1 text-sm">
                          🏆 {userWinnerInfo.rank}
                          {userWinnerInfo.rank === 1
                            ? 'st'
                            : userWinnerInfo.rank === 2
                            ? 'nd'
                            : userWinnerInfo.rank === 3
                            ? 'rd'
                            : 'th'}{' '}
                          Place Winner
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Your Winning Solution:
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {userSubmission?.content}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Payment Details:</h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-semibold">
                            {userWinnerInfo?.amountSats.toLocaleString()} sats
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Lightning Address:
                          </span>
                          <code className="font-mono text-xs">
                            {userSubmission?.lightningAddress}
                          </code>
                        </div>
                        {userWinnerInfo?.paymentProof && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Payment Proof:
                            </span>
                            <code className="font-mono text-xs">
                              {userWinnerInfo.paymentProof}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Payment has been sent to your Lightning address.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Solution, Submission Status, or Winner Status */}
          {bounty.status === 'open' && !isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {isUserWinner
                    ? 'Congratulations! You Won!'
                    : hasUserSubmitted
                    ? 'Your Submission'
                    : 'Submit Solution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isUserWinner ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                          🎉 Winner!
                        </span>
                      </div>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Congratulations! You won this bounty and will receive{' '}
                        <span className="font-bold">
                          {userWinnerInfo?.amountSats.toLocaleString()} sats
                        </span>
                        {userWinnerInfo?.rank && (
                          <span className="block mt-1 text-sm">
                            🏆 {userWinnerInfo.rank}
                            {userWinnerInfo.rank === 1
                              ? 'st'
                              : userWinnerInfo.rank === 2
                              ? 'nd'
                              : userWinnerInfo.rank === 3
                              ? 'rd'
                              : 'th'}{' '}
                            Place Winner
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">
                        Your Winning Solution:
                      </h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {userSubmission?.content}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Payment Details:</h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Amount:
                            </span>
                            <span className="font-semibold">
                              {userWinnerInfo?.amountSats.toLocaleString()} sats
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Lightning Address:
                            </span>
                            <code className="font-mono text-xs">
                              {userSubmission?.lightningAddress}
                            </code>
                          </div>
                          {userWinnerInfo?.paymentProof && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Payment Proof:
                              </span>
                              <code className="font-mono text-xs">
                                {userWinnerInfo.paymentProof}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Payment will be sent to your Lightning address shortly.
                      </p>
                    </div>
                  </div>
                ) : hasUserSubmitted ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Submission Received
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Submitted on{' '}
                        {new Date(userSubmission!.submittedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Your Solution:</h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {userSubmission!.content}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Payment Address:</h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <code className="text-sm font-mono">
                          {userSubmission!.lightningAddress}
                        </code>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Your submission is being reviewed by the bounty owner.
                      </p>
                    </div>
                  </div>
                ) : canSubmit ? (
                  <Button
                    onClick={() => setShowSubmissionModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    Submit Solution
                  </Button>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      {displayStatus === 'closed'
                        ? 'Submissions are closed - deadline has passed'
                        : 'Submissions are not currently allowed'}
                    </p>
                    <Button
                      disabled
                      className="w-full bg-gray-400 cursor-not-allowed"
                    >
                      Submit Solution
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submission Modal */}
      {bounty && (
        <SubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          bountyId={bounty.id}
          bountyTitle={bounty.title}
        />
      )}

      {/* Lightning Invoice Modal */}
      {bounty && (
        <LightningInvoiceModal
          isOpen={showLightningModal}
          onClose={() => setShowLightningModal(false)}
          lightningInvoice={lightningInvoice}
          amountSats={fundingAmount}
          bountyTitle={bounty.title}
          bountyId={bounty.id}
        />
      )}
    </div>
  );
}
