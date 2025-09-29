export type GigStatus =
  | 'open'
  | 'application_selected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type GigDisplayStatus =
  | 'open'
  | 'application_selected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface GigMilestone {
  id: string;
  amountSats: number;
  description: string;
  eta: number; // timestamp in milliseconds
  status: 'pending' | 'funded' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: number;
  submittedContent?: string;
  submittedLightningAddress?: string;
  rejectionReason?: string;
}

export interface GigApplication {
  id: string;
  gigId: string;
  applicantPubkey: string;
  portfolioLink?: string;
  offerAmountSats: number;
  milestones: GigMilestone[];
  submittedAt: number;
  status: 'pending' | 'selected' | 'rejected';
  selectedAt?: number;
  rejectionReason?: string;
}

export interface Gig {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  budgetRange?: {
    minSats: number;
    maxSats: number;
  };
  status: GigStatus;
  applications: GigApplication[];
  selectedApplicationId?: string;
  pendingInvoice?: {
    milestoneId: string;
    applicationId: string;
    amountSats: number;
    paymentHash: string;
    paymentRequest: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Utility functions for gig status
export const gigUtils = {
  // Get the display status
  getDisplayStatus: (gig: Gig): GigDisplayStatus => {
    return gig.status;
  },

  // Check if applications are currently allowed
  canApply: (gig: Gig): boolean => {
    return gig.status === 'open';
  },

  // Check if gig can be cancelled
  canCancel: (gig: Gig): boolean => {
    return gig.status === 'open' && !gig.selectedApplicationId;
  },

  // Check if sponsor can select applications
  canSelectApplication: (gig: Gig): boolean => {
    return gig.status === 'open' && gig.applications.length > 0;
  },

  // Check if gig is in progress
  isInProgress: (gig: Gig): boolean => {
    return gig.status === 'in_progress';
  },

  // Get status badge variant
  getStatusBadgeVariant: (
    status: GigDisplayStatus
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
      case 'application_selected':
        return 'warning';
      case 'in_progress':
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
  getStatusText: (status: GigDisplayStatus): string => {
    switch (status) {
      case 'open':
        return 'Open for Applications';
      case 'application_selected':
        return 'Application Selected';
      case 'in_progress':
        return 'In Progress';
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

  // Format budget display
  formatBudget: (budgetRange?: {
    minSats: number;
    maxSats: number;
  }): string => {
    if (!budgetRange) return '';

    if (budgetRange.minSats === budgetRange.maxSats) {
      return `${budgetRange.minSats.toLocaleString()} sats`;
    }

    return `${budgetRange.minSats.toLocaleString()} - ${budgetRange.maxSats.toLocaleString()} sats`;
  },

  // Check if budget is a single amount
  isSingleAmount: (budgetRange?: {
    minSats: number;
    maxSats: number;
  }): boolean => {
    return budgetRange ? budgetRange.minSats === budgetRange.maxSats : false;
  },

  // Calculate total milestone amount
  calculateTotalMilestoneAmount: (milestones: GigMilestone[]): number => {
    return milestones.reduce((sum, milestone) => sum + milestone.amountSats, 0);
  },

  // Check if milestone sum equals offer amount
  validateMilestoneSum: (
    milestones: GigMilestone[],
    offerAmount: number
  ): boolean => {
    const total = gigUtils.calculateTotalMilestoneAmount(milestones);
    return total === offerAmount;
  },

  // Get next milestone to work on
  getNextMilestone: (gig: Gig): GigMilestone | null => {
    if (!gig.selectedApplicationId) return null;

    const selectedApp = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!selectedApp) return null;

    return (
      selectedApp.milestones.find(
        (milestone) => milestone.status === 'funded'
      ) || null
    );
  },

  // Check if all milestones are completed
  areAllMilestonesCompleted: (gig: Gig): boolean => {
    if (!gig.selectedApplicationId) return false;

    const selectedApp = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!selectedApp) return false;

    return selectedApp.milestones.every(
      (milestone) => milestone.status === 'accepted'
    );
  },

  // Get completed milestones count
  getCompletedMilestonesCount: (gig: Gig): number => {
    if (!gig.selectedApplicationId) return 0;

    const selectedApp = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!selectedApp) return 0;

    return selectedApp.milestones.filter(
      (milestone) => milestone.status === 'accepted'
    ).length;
  },

  // Get total milestones count
  getTotalMilestonesCount: (gig: Gig): number => {
    if (!gig.selectedApplicationId) return 0;

    const selectedApp = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!selectedApp) return 0;

    return selectedApp.milestones.length;
  },
};
