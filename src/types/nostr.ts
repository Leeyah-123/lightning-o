export type NostrEventKind =
  | 'bounty:create'
  | 'bounty:open'
  | 'bounty:complete'
  | 'bounty:submit';

// Mapping from string kinds to numeric kinds
export const NOSTR_KIND_MAP: Record<NostrEventKind, number> = {
  'bounty:create': 51341,
  'bounty:open': 51342,
  'bounty:complete': 51343,
  'bounty:submit': 51344,
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

export const SYSTEM_PUBKEY_TAG = 'system-pubkey';
