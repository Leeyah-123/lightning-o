'use client';

import { cacheService } from '@/services/cache-service';
import { gigService } from '@/services/gig-service';
import { nostrService } from '@/services/nostr-service';
import { profileService } from '@/services/profile-service';
import type { Gig } from '@/types/gig';
import { create } from 'zustand';
import { useAuth } from './auth';
import { useCache } from './cache';

export type KeyPair = { sk: string; pk: string };

interface GigsState {
  gigs: Gig[];
  isLoading: boolean;
  error: string | null;
  systemKeys?: KeyPair;
  unsubscribe?: () => void;
  init(): Promise<void>;
  getOrCreateSystemKeys(): Promise<KeyPair>;
  resetSystemKeys(): void;
  createGig(input: {
    title: string;
    shortDescription: string;
    description: string;
    budgetRange?: {
      minSats: number;
      maxSats: number;
    };
  }): Promise<Gig>;
  applyToGig(input: {
    gigId: string;
    portfolioLink?: string;
    offerAmountSats: number;
    milestones: Array<{
      amountSats: number;
      description: string;
      eta: number;
    }>;
  }): Promise<void>;
  selectApplication(input: {
    gigId: string;
    applicationId: string;
  }): Promise<void>;
  fundMilestone(input: { gigId: string; milestoneId: string }): Promise<{
    success: boolean;
    lightningInvoice?: string;
    paymentHash?: string;
    error?: string;
  }>;
  submitMilestone(input: {
    gigId: string;
    milestoneId: string;
    content: string;
    lightningAddress: string;
  }): Promise<void>;
  reviewMilestone(input: {
    gigId: string;
    milestoneId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
  }): Promise<void>;
  cancelGig(input: { gigId: string; reason?: string }): Promise<void>;
  refresh(): Promise<void>;
}

export const useGigs = create<GigsState>((set) => ({
  gigs: [],
  isLoading: false,
  error: null,
  async init() {
    try {
      set({ isLoading: true, error: null });

      // Use cache service for initialization
      await cacheService.initializeGigs();

      // Get data from cache
      const cache = useCache.getState();
      set({
        gigs: cache.gigs,
        isLoading: cache.isLoading.gigs,
        error: cache.errors.gigs,
      });

      // Subscribe to cache changes
      const unsubscribe = useCache.subscribe((state) => {
        set({
          gigs: state.gigs,
          isLoading: state.isLoading.gigs,
          error: state.errors.gigs,
        });
      });

      // Store unsubscribe function for cleanup
      set({ unsubscribe });
    } catch (error) {
      console.error('Failed to initialize gigs:', error);
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

  async createGig(input): Promise<Gig> {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    return gigService.create({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async applyToGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const applicantKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.apply({ ...input, applicantKeys });
    // Cache will be updated via the onChangeCallback
  },

  async selectApplication(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.selectApplication({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async fundMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    const result = await gigService.fundMilestone({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
    return result;
  },

  async submitMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const submitterKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.submitMilestone({ ...input, submitterKeys });
    // Cache will be updated via the onChangeCallback
  },

  async reviewMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.reviewMilestone({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async cancelGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.cancelGig({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async refresh() {
    await cacheService.refresh('gigs');
    const cache = useCache.getState();
    set({
      gigs: cache.gigs,
      isLoading: cache.isLoading.gigs,
      error: cache.errors.gigs,
    });
  },

  resetSystemKeys() {
    const newSystemKeys = nostrService.generateKeys();
    gigService.setSystemKeys(newSystemKeys);
    set({ systemKeys: newSystemKeys });
  },
}));
