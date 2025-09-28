export type BountyStatus = 'pending' | 'open' | 'completed';
export type BountyDisplayStatus = 'pending' | 'open' | 'closed' | 'completed';

export interface BountySubmission {
  id: string;
  pubkey: string;
  content: string;
  lightningAddress: string; // Required for payment
  submittedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Bounty {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  rewardSats: number | number[]; // Single amount or array for multiple tiers
  status: BountyStatus;
  submissionDeadline: number; // timestamp in milliseconds
  judgingDeadline: number; // timestamp in milliseconds
  escrowTxId?: string;
  submissions?: BountySubmission[];
  winners?: Array<{
    pubkey: string;
    amountSats: number;
    paymentProof: string;
    rank: number;
  }>;
  createdAt: number;
}

// Utility functions for bounty status
export const bountyUtils = {
  // Get the display status considering deadlines
  getDisplayStatus: (bounty: Bounty): BountyDisplayStatus => {
    if (bounty.status === 'completed') return 'completed';
    if (bounty.status === 'pending') return 'pending';

    // For 'open' status, check if submission deadline has passed
    const now = Date.now();
    if (now > bounty.submissionDeadline) {
      return 'closed';
    }

    return 'open';
  },

  // Check if submissions are currently allowed
  canSubmit: (bounty: Bounty): boolean => {
    return bounty.status === 'open' && Date.now() <= bounty.submissionDeadline;
  },

  // Check if judging is currently allowed
  canJudge: (bounty: Bounty): boolean => {
    return (
      bounty.status === 'open' &&
      Date.now() >= bounty.submissionDeadline &&
      !!bounty.submissions &&
      bounty.submissions.length > 0
    );
  },

  // Get status badge variant
  getStatusBadgeVariant: (
    status: BountyDisplayStatus
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'open':
        return 'default';
      case 'closed':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  },

  // Get status text
  getStatusText: (status: BountyDisplayStatus): string => {
    switch (status) {
      case 'pending':
        return 'Pending Funding';
      case 'open':
        return 'Open for Submissions';
      case 'closed':
        return 'Closed for Submissions';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  },
};
