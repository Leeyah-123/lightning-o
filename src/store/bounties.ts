'use client';

import { bountyService } from '@/services/bounty-service';
import { nostrService } from '@/services/nostr-service';
import { profileService } from '@/services/profile-service';
import type { Bounty } from '@/types/bounty';
import { create } from 'zustand';
import { useAuth } from './auth';

export type KeyPair = { sk: string; pk: string };

interface BountiesState {
  bounties: Bounty[];
  systemKeys?: KeyPair;
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
  }): Promise<void>;
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
  refresh(): void;
}

export const useBounties = create<BountiesState>((set, get) => ({
  bounties: [],
  async init() {
    // Generate or retrieve system keys for platform operations
    // These keys are used to sign platform events (bounty open, completed)
    const systemKeys = await get().getOrCreateSystemKeys();
    bountyService.setSystemKeys(systemKeys);

    // Set up callback to update store when bounties change
    bountyService.setOnChangeCallback(() => {
      set({ bounties: bountyService.list() });
    });

    bountyService.startWatchers();
    set({ systemKeys, bounties: bountyService.list() });
  },

  async getOrCreateSystemKeys(): Promise<KeyPair> {
    const STORAGE_KEY = 'lightning-system-keys';

    // Try to get existing system keys from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const keys = JSON.parse(stored);
          if (keys.sk && keys.pk) {
            return keys;
          }
        } catch (error) {
          console.warn('Failed to parse stored system keys:', error);
        }
      }
    }

    // Fetch system keys from server
    try {
      const response = await fetch('/api/system-keys');
      if (response.ok) {
        const { privateKey, publicKey } = await response.json();
        const systemKeys = { sk: privateKey, pk: publicKey };

        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(systemKeys));
        }

        return systemKeys;
      }
    } catch (error) {
      console.warn('Failed to fetch system keys from server:', error);
    }

    // Fallback: Generate new system keys locally
    const systemKeys = nostrService.generateKeys();

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(systemKeys));
    }

    return systemKeys;
  },
  async createBounty(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await bountyService.create({ ...input, sponsorKeys });
    set({ bounties: bountyService.list() });
  },
  async fundBounty(bountyId) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    const result = await bountyService.fund(bountyId, sponsorKeys);
    set({ bounties: bountyService.list() });
    return result;
  },
  async completeBounty(bountyId, selectedSubmissionIds) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await bountyService.complete(bountyId, sponsorKeys, selectedSubmissionIds);
    set({ bounties: bountyService.list() });
  },

  async submitToBounty(bountyId, content, lightningAddress) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const submitterKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await bountyService.submitToBounty(
      bountyId,
      submitterKeys,
      content,
      lightningAddress
    );
    set({ bounties: bountyService.list() });
  },
  refresh() {
    set({ bounties: bountyService.list() });
  },

  resetSystemKeys() {
    const STORAGE_KEY = 'lightning-system-keys';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    const newSystemKeys = nostrService.generateKeys();
    bountyService.setSystemKeys(newSystemKeys);
    set({ systemKeys: newSystemKeys });
  },
}));
