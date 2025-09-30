'use client';

import { bountyService } from '@/services/bounty-service';
import { cacheService } from '@/services/cache-service';
import { nostrService } from '@/services/nostr-service';
import { profileService } from '@/services/profile-service';
import type { Bounty } from '@/types/bounty';
import { create } from 'zustand';
import { useAuth } from './auth';
import { useCache } from './cache';

export type KeyPair = { sk: string; pk: string };

interface BountiesState {
  bounties: Bounty[];
  isLoading: boolean;
  error: string | null;
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
  refresh(): Promise<void>;
}

export const useBounties = create<BountiesState>((set, get) => ({
  bounties: [],
  isLoading: false,
  error: null,
  async init() {
    try {
      set({ isLoading: true, error: null });

      // Use cache service for initialization
      await cacheService.initializeBounties();

      // Get data from cache
      const cache = useCache.getState();
      set({
        bounties: cache.bounties,
        isLoading: cache.isLoading.bounties,
        error: cache.errors.bounties,
      });

      // Subscribe to cache changes
      const unsubscribe = useCache.subscribe((state) => {
        set({
          bounties: state.bounties,
          isLoading: state.isLoading.bounties,
          error: state.errors.bounties,
        });
      });

      // Store unsubscribe function for cleanup
      (get() as any).unsubscribe = unsubscribe;
    } catch (error) {
      console.error('Failed to initialize bounties:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
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
    // Cache will be updated via the onChangeCallback
  },
  async fundBounty(bountyId) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    const result = await bountyService.fund(bountyId, sponsorKeys);
    // Cache will be updated via the onChangeCallback
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
    // Cache will be updated via the onChangeCallback
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
    // Cache will be updated via the onChangeCallback
  },
  async refresh() {
    await cacheService.refresh('bounties');
    const cache = useCache.getState();
    set({
      bounties: cache.bounties,
      isLoading: cache.isLoading.bounties,
      error: cache.errors.bounties,
    });
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
