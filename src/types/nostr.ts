export type NostrEventKind =
  | 'bounty:create'
  | 'bounty:open'
  | 'bounty:complete'
  | 'bounty:submit'
  | 'gig:create'
  | 'gig:apply'
  | 'gig:select'
  | 'gig:funded'
  | 'gig:submit_milestone'
  | 'gig:approve_milestone'
  | 'gig:reject_milestone'
  | 'gig:complete'
  | 'gig:cancel'
  | 'grant:create'
  | 'grant:apply'
  | 'grant:select'
  | 'grant:funded'
  | 'grant:submit_tranche'
  | 'grant:approve_tranche'
  | 'grant:reject_tranche'
  | 'grant:complete'
  | 'grant:cancel';

// Mapping from string kinds to numeric kinds
export const NOSTR_KIND_MAP: Record<NostrEventKind, number> = {
  'bounty:create': 51341,
  'bounty:open': 51342,
  'bounty:complete': 51343,
  'bounty:submit': 51344,
  'gig:create': 51401,
  'gig:apply': 51402,
  'gig:select': 51403,
  'gig:funded': 51404,
  'gig:submit_milestone': 51405,
  'gig:approve_milestone': 51406,
  'gig:reject_milestone': 51407,
  'gig:complete': 51408,
  'gig:cancel': 51409,
  'grant:create': 51501,
  'grant:apply': 51502,
  'grant:select': 51503,
  'grant:funded': 51504,
  'grant:submit_tranche': 51505,
  'grant:approve_tranche': 51506,
  'grant:reject_tranche': 51507,
  'grant:complete': 51508,
  'grant:cancel': 51509,
};

// Helper function to convert string kind to number
export const getKindNumber = (kind: NostrEventKind): number => {
  return NOSTR_KIND_MAP[kind] || 51341;
};

export interface NostrEventBase {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string; // JSON string
  sig: string;
  tags: string[][];
}

export interface BountyContentPending {
  type: 'pending' | '';
  bountyId: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  rewardSats: number | number[];
  submissionDeadline: number;
  judgingDeadline: number;
}

export interface BountyContentOpen {
  type: 'open';
  bountyId: string;
  escrowTxId: string;
  lightningInvoice?: string;
  amountSats?: number;
  paymentHash?: string;
}

export interface BountyContentComplete {
  type: 'completed';
  bountyId: string;
  winners: Array<{ pubkey: string; amountSats: number; paymentProof: string }>;
}

export interface BountyContentSubmit {
  type: 'submit';
  bountyId: string;
  submissionId: string;
  content: string;
  lightningAddress: string;
  submitterPubkey: string;
}

export type BountyContent =
  | BountyContentPending
  | BountyContentOpen
  | BountyContentComplete
  | BountyContentSubmit;

// Gig Content Types
export interface GigContentCreate {
  type: 'create';
  gigId: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  budgetRange?: {
    minSats: number;
    maxSats: number;
  };
}

export interface GigContentApply {
  type: 'apply';
  gigId: string;
  applicationId: string;
  applicantPubkey: string;
  portfolioLink?: string;
  offerAmountSats: number;
  milestones: Array<{
    id: string;
    amountSats: number;
    description: string;
    eta: number;
  }>;
}

export interface GigContentSelect {
  type: 'select';
  gigId: string;
  applicationId: string;
  sponsorPubkey: string;
}

export interface GigContentFunded {
  type: 'funded';
  gigId: string;
  applicationId: string;
  milestoneId: string;
  lightningInvoice: string;
  amountSats: number;
  paymentHash: string;
  sponsorPubkey: string;
}

export interface GigContentSubmitMilestone {
  type: 'submit_milestone';
  gigId: string;
  applicationId: string;
  milestoneId: string;
  content: string;
  lightningAddress: string;
  submitterPubkey: string;
}

export interface GigContentApproveMilestone {
  type: 'approve_milestone';
  gigId: string;
  applicationId: string;
  milestoneId: string;
  sponsorPubkey: string;
  paymentProof: string;
}

export interface GigContentRejectMilestone {
  type: 'reject_milestone';
  gigId: string;
  applicationId: string;
  milestoneId: string;
  sponsorPubkey: string;
  rejectionReason: string;
}

export interface GigContentComplete {
  type: 'complete';
  gigId: string;
  applicationId: string;
  sponsorPubkey: string;
}

export interface GigContentCancel {
  type: 'cancel';
  gigId: string;
  sponsorPubkey: string;
  reason?: string;
}

export type GigContent =
  | GigContentCreate
  | GigContentApply
  | GigContentSelect
  | GigContentFunded
  | GigContentSubmitMilestone
  | GigContentApproveMilestone
  | GigContentRejectMilestone
  | GigContentComplete
  | GigContentCancel;

// Grant Content Types
export interface GrantContentCreate {
  type: 'create';
  grantId: string;
  title: string;
  shortDescription: string;
  description: string;
  sponsorPubkey: string;
  reward: {
    type: 'fixed' | 'range';
    amount: number;
    maxAmount?: number;
  };
  tranches: Array<{
    amountSats: number;
    description: string;
  }>;
}

export interface GrantContentApply {
  type: 'apply';
  grantId: string;
  applicationId: string;
  applicantPubkey: string;
  portfolioLink?: string;
  proposal: string;
  budgetRequest?: number;
}

export interface GrantContentSelect {
  type: 'select';
  grantId: string;
  applicationId: string;
  sponsorPubkey: string;
  finalAllocation?: number;
}

export interface GrantContentFunded {
  type: 'funded';
  grantId: string;
  applicationId: string;
  trancheId: string;
  lightningInvoice: string;
  amountSats: number;
  paymentHash: string;
  sponsorPubkey: string;
}

export interface GrantContentSubmitTranche {
  type: 'submit_tranche';
  grantId: string;
  applicationId: string;
  trancheId: string;
  content: string;
  links?: string[];
  submitterPubkey: string;
}

export interface GrantContentApproveTranche {
  type: 'approve_tranche';
  grantId: string;
  applicationId: string;
  trancheId: string;
  sponsorPubkey: string;
  paymentProof: string;
}

export interface GrantContentRejectTranche {
  type: 'reject_tranche';
  grantId: string;
  applicationId: string;
  trancheId: string;
  sponsorPubkey: string;
  rejectionReason: string;
}

export interface GrantContentComplete {
  type: 'complete';
  grantId: string;
  applicationId: string;
  sponsorPubkey: string;
}

export interface GrantContentCancel {
  type: 'cancel';
  grantId: string;
  sponsorPubkey: string;
  reason?: string;
}

export type GrantContent =
  | GrantContentCreate
  | GrantContentApply
  | GrantContentSelect
  | GrantContentFunded
  | GrantContentSubmitTranche
  | GrantContentApproveTranche
  | GrantContentRejectTranche
  | GrantContentComplete
  | GrantContentCancel;

export const SYSTEM_PUBKEY_TAG = 'system-pubkey';
