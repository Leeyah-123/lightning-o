'use client';

import { LightningInvoiceModal } from '@/components/bounty/LightningInvoiceModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { validationUtils } from '@/lib/validation';
import { useBounties } from '@/store/bounties';
import type { Bounty, BountyDisplayStatus } from '@/types/bounty';
import { bountyUtils } from '@/types/bounty';
import { Award, Calendar, Clock, ExternalLink, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BountyCardProps {
  bounty: Bounty;
  isOwner: boolean;
  isLoading?: boolean;
  currentUserPubkey?: string;
}

export function BountyCard({
  bounty,
  isOwner,
  isLoading = false,
  currentUserPubkey,
}: BountyCardProps) {
  const router = useRouter();
  const { fundBounty } = useBounties();

  // State for Lightning invoice modal
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if current user is a winner
  const isUserWinner =
    currentUserPubkey &&
    bounty.winners?.some((winner) => winner.pubkey === currentUserPubkey);

  // Get user's winner info if they won
  const userWinnerInfo = currentUserPubkey
    ? bounty.winners?.find((winner) => winner.pubkey === currentUserPubkey)
    : null;

  const getStatusVariant = (status: BountyDisplayStatus) => {
    return bountyUtils.getStatusBadgeVariant(status);
  };

  const getStatusIcon = (status: BountyDisplayStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'open':
        return <Zap className="h-3 w-3" />;
      case 'closed':
        return <Clock className="h-3 w-3" />;
      case 'completed':
        return <Award className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const displayStatus = bountyUtils.getDisplayStatus(bounty);

  const handleFund = async () => {
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {bounty.title}
            </CardTitle>
            {isUserWinner && (
              <Badge
                variant="default"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 text-xs flex-shrink-0"
              >
                🏆 {userWinnerInfo?.rank}
                {userWinnerInfo?.rank === 1
                  ? 'st'
                  : userWinnerInfo?.rank === 2
                  ? 'nd'
                  : userWinnerInfo?.rank === 3
                  ? 'rd'
                  : 'th'}
              </Badge>
            )}
          </div>
          <Badge
            variant={getStatusVariant(displayStatus)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(displayStatus)}
            {bountyUtils.getStatusText(displayStatus).toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-3 leading-relaxed">
          {bounty.shortDescription}
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/bounties/${bounty.id}`)}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </Button>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">
                  {validationUtils
                    .getTotalReward(bounty.rewardSats)
                    .toLocaleString()}{' '}
                  sats
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  Sponsor:{' '}
                  {truncateMiddle(normalizeToNpub(bounty.sponsorPubkey), 6, 4)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                Submit by:{' '}
                {new Date(bounty.submissionDeadline).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              <span>
                {isOwner ? 'Judge by' : 'Will be judged by'}:{' '}
                {new Date(bounty.judgingDeadline).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {bounty.escrowTxId && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Escrow: {truncateMiddle(bounty.escrowTxId, 8, 8)}
          </div>
        )}

        {bounty.winners && bounty.winners.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              Winners:
            </div>
            <div className="space-y-1">
              {bounty.winners.map((winner, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded"
                >
                  <span className="font-mono">
                    {truncateMiddle(winner.pubkey, 8, 8)}
                  </span>
                  <span className="font-medium">
                    {winner.amountSats.toLocaleString()} sats
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="flex gap-2 pt-2">
            {bounty.status === 'pending' && (
              <Button
                onClick={handleFund}
                disabled={isLoading || isProcessing}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading || isProcessing ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  'Fund Bounty'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Lightning Invoice Modal */}
      <LightningInvoiceModal
        isOpen={showLightningModal}
        onClose={() => setShowLightningModal(false)}
        lightningInvoice={lightningInvoice}
        amountSats={fundingAmount}
        bountyTitle={bounty.title}
        bountyId={bounty.id}
      />
    </Card>
  );
}
