'use client';

import { bountyService } from '@/services/bounty-service';
import { nostrService } from '@/services/nostr-service';
import type { Bounty } from '@/types/bounty';
import { create } from 'zustand';
import { useAuth } from './auth';

export type KeyPair = { sk: string; pk: string };

interface BountiesState {
  bounties: Bounty[];
  isLoading: boolean;
  error: string | null;
  systemKeys?: KeyPair;
  unsubscribe?: () => void;
  init(): Promise<void>;
  getOrCreateSystemKeys(): Promise<KeyPair>;
  resetSystemKeys(): void;
  createBounty(input: {
    title: string;
    shortDescription: string;
    description: string;
    rewardSats: number | number[];
    submissionDeadline: Date;
    judgingDeadline: Date;
  }): Promise<Bounty>;
  submitToBounty(
    bountyId: string,
    content: string,
    lightningAddress: string
  ): Promise<void>;
  completeBounty(
    bountyId: string,
    selectedSubmissionIds: string[]
  ): Promise<void>;
  fundBounty(bountyId: string): Promise<{
    success: boolean;
    lightningInvoice?: string;
    escrowTxId?: string;
    error?: string;
  }>;
  refresh(): Promise<void>;
}

export const useBounties = create<BountiesState>((set) => ({
  bounties: [],
  isLoading: false,
  error: null,
  async init() {
    try {
      set({ isLoading: true, error: null });

      // Initialize bounty service directly
      bountyService.startWatchers();

      // Subscribe to changes from the service
      const unsubscribe = bountyService.subscribeToChanges(() => {
        const bounties = bountyService.list();
        set({ bounties });
      });

      // Store unsubscribe function for cleanup
      set({ unsubscribe });

      // Get initial data from service
      const bounties = bountyService.list();
      set({
        bounties,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize bounties:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  async getOrCreateSystemKeys(): Promise<KeyPair> {
    // Fetch system keys from server
    try {
      const response = await fetch('/api/system-keys');
      if (response.ok) {
        const { privateKey, publicKey } = await response.json();
        return { sk: privateKey, pk: publicKey };
      }
    } catch (error) {
      console.warn('Failed to fetch system keys from server:', error);
    }

    // Fallback: Generate new system keys locally
    return nostrService.generateKeys();
  },
  async createBounty(input): Promise<Bounty> {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    return bountyService.create({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },
  async fundBounty(bountyId) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    const result = await bountyService.fund(bountyId, sponsorKeys);
    // Cache will be updated via the onChangeCallback
    return result;
  },
  async completeBounty(bountyId, selectedSubmissionIds) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await bountyService.complete(bountyId, sponsorKeys, selectedSubmissionIds);
    // Cache will be updated via the onChangeCallback
  },

  async submitToBounty(bountyId, content, lightningAddress) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const submitterKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await bountyService.submitToBounty(
      bountyId,
      submitterKeys,
      content,
      lightningAddress
    );
    // Cache will be updated via the onChangeCallback
  },
  async refresh() {
    // Re-initialize the service
    set({ isLoading: true, error: null });
    try {
      bountyService.startWatchers();
      const bounties = bountyService.list();
      set({ bounties, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  resetSystemKeys() {
    const newSystemKeys = nostrService.generateKeys();
    bountyService.setSystemKeys(newSystemKeys);
    set({ systemKeys: newSystemKeys });
  },
}));
