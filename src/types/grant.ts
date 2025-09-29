export type GrantStatus =
  | 'open'
  | 'partially_active'
  | 'active'
  | 'completed'
  | 'cancelled';

export type GrantDisplayStatus =
  | 'open'
  | 'partially_active'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface GrantTranche {
  id: string;
  amountSats: number;
  description: string;
  status: 'pending' | 'funded' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: number;
  submittedContent?: string;
  submittedLinks?: string[];
  rejectionReason?: string;
}

export interface GrantApplication {
  id: string;
  grantId: string;
  applicantPubkey: string;
  portfolioLink?: string;
  proposal: string;
  budgetRequest?: number; // Only if sponsor set a range
  submittedAt: number;
  status: 'pending' | 'selected' | 'rejected';
  selectedAt?: number;
  rejectionReason?: string;
  finalAllocation?: number; // Final amount allocated by sponsor
}

export interface Grant {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  reward: {
    type: 'fixed' | 'range';
    amount: number; // Fixed amount or min amount for range
    maxAmount?: number; // Only for range type
  };
  tranches: GrantTranche[];
  status: GrantStatus;
  applications: GrantApplication[];
  selectedApplicationIds: string[]; // Multiple selections allowed
  pendingInvoice?: {
    applicationId: string;
    trancheId: string;
    amountSats: number;
    paymentHash: string;
    paymentRequest: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Utility functions for grant status
export const grantUtils = {
  // Get the display status
  getDisplayStatus: (grant: Grant): GrantDisplayStatus => {
    return grant.status;
  },

  // Check if applications are currently allowed
  canApply: (grant: Grant): boolean => {
    return grant.status === 'open' || grant.status === 'partially_active';
  },

  // Check if grant can be cancelled
  canCancel: (grant: Grant): boolean => {
    return grant.status === 'open' && grant.selectedApplicationIds.length === 0;
  },

  // Check if sponsor can select applications
  canSelectApplication: (grant: Grant): boolean => {
    return (
      (grant.status === 'open' || grant.status === 'partially_active') &&
      grant.applications.length > 0
    );
  },

  // Check if grant is active
  isActive: (grant: Grant): boolean => {
    return grant.status === 'active' || grant.status === 'partially_active';
  },

  // Get status badge variant
  getStatusBadgeVariant: (
    status: GrantDisplayStatus
  ):
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning' => {
    switch (status) {
      case 'open':
        return 'default';
      case 'partially_active':
        return 'warning';
      case 'active':
        return 'secondary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  },

  // Get status text
  getStatusText: (status: GrantDisplayStatus): string => {
    switch (status) {
      case 'open':
        return 'Open for Applications';
      case 'partially_active':
        return 'Partially Active';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  },

  // Get relative time string
  getRelativeTime: (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  },

  // Format reward display
  formatReward: (reward: Grant['reward']): string => {
    if (reward.type === 'fixed') {
      return `${reward.amount.toLocaleString()} sats`;
    } else {
      if (reward.amount === reward.maxAmount) {
        return `${reward.amount.toLocaleString()} sats`;
      }
      return `${reward.amount.toLocaleString()} - ${reward.maxAmount!.toLocaleString()} sats`;
    }
  },

  // Check if reward is a single amount
  isSingleAmount: (reward: Grant['reward']): boolean => {
    return (
      reward.type === 'fixed' ||
      (reward.type === 'range' && reward.amount === reward.maxAmount)
    );
  },

  // Calculate total tranche amount
  calculateTotalTrancheAmount: (tranches: GrantTranche[]): number => {
    return tranches.reduce((sum, tranche) => sum + tranche.amountSats, 0);
  },

  // Check if tranche sum equals reward amount
  validateTrancheSum: (
    tranches: GrantTranche[],
    reward: Grant['reward']
  ): boolean => {
    const total = grantUtils.calculateTotalTrancheAmount(tranches);
    if (reward.type === 'fixed') {
      return total === reward.amount;
    }
    return (
      total >= reward.amount && total <= (reward.maxAmount || reward.amount)
    );
  },

  // Get next tranche to work on for a specific application
  getNextTranche: (
    grant: Grant,
    applicationId: string
  ): GrantTranche | null => {
    const application = grant.applications.find(
      (app) => app.id === applicationId
    );
    if (!application || !grant.selectedApplicationIds.includes(applicationId)) {
      return null;
    }

    return (
      grant.tranches.find((tranche) => tranche.status === 'funded') || null
    );
  },

  // Check if all tranches are completed for a specific application
  areAllTranchesCompleted: (grant: Grant, applicationId: string): boolean => {
    const application = grant.applications.find(
      (app) => app.id === applicationId
    );
    if (!application || !grant.selectedApplicationIds.includes(applicationId)) {
      return false;
    }

    return grant.tranches.every((tranche) => tranche.status === 'accepted');
  },

  // Get completed tranches count for a specific application
  getCompletedTranchesCount: (grant: Grant, applicationId: string): number => {
    const application = grant.applications.find(
      (app) => app.id === applicationId
    );
    if (!application || !grant.selectedApplicationIds.includes(applicationId)) {
      return 0;
    }

    return grant.tranches.filter((tranche) => tranche.status === 'accepted')
      .length;
  },

  // Get total tranches count
  getTotalTranchesCount: (grant: Grant): number => {
    return grant.tranches.length;
  },

  // Check if grant is fully completed (all selected applications completed)
  isFullyCompleted: (grant: Grant): boolean => {
    if (grant.selectedApplicationIds.length === 0) return false;

    return grant.selectedApplicationIds.every((applicationId) =>
      grantUtils.areAllTranchesCompleted(grant, applicationId)
    );
  },
};
