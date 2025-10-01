'use client';

import { gigService } from '@/services/gig-service';
import { nostrService } from '@/services/nostr-service';
import type { Gig } from '@/types/gig';
import { create } from 'zustand';
import { useAuth } from './auth';

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

      // Initialize gig service directly
      gigService.startWatchers();

      // Subscribe to changes from the service
      const unsubscribe = gigService.subscribeToChanges(() => {
        const gigs = gigService.list();
        set({ gigs });
      });

      // Store unsubscribe function for cleanup
      set({ unsubscribe });

      // Get initial data from service
      const gigs = gigService.list();
      set({
        gigs,
        isLoading: false,
      });
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
      sk: user.secretKey,
      pk: user.pubkey,
    };
    return gigService.create({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async applyToGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const applicantKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await gigService.apply({ ...input, applicantKeys });
    // Cache will be updated via the onChangeCallback
  },

  async selectApplication(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await gigService.selectApplication({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async fundMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    const result = await gigService.fundMilestone({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
    return result;
  },

  async submitMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const submitterKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await gigService.submitMilestone({ ...input, submitterKeys });
    // Cache will be updated via the onChangeCallback
  },

  async reviewMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await gigService.reviewMilestone({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async cancelGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };
    await gigService.cancelGig({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
  },

  async refresh() {
    // Re-initialize the service
    set({ isLoading: true, error: null });
    try {
      gigService.startWatchers();
      const gigs = gigService.list();
      set({ gigs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  resetSystemKeys() {
    const newSystemKeys = nostrService.generateKeys();
    gigService.setSystemKeys(newSystemKeys);
    set({ systemKeys: newSystemKeys });
  },
}));
