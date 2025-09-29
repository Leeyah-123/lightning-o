'use client';

import { gigService } from '@/services/gig-service';
import { nostrService } from '@/services/nostr-service';
import { profileService } from '@/services/profile-service';
import type { Gig } from '@/types/gig';
import { create } from 'zustand';
import { useAuth } from './auth';

export type KeyPair = { sk: string; pk: string };

interface GigsState {
  gigs: Gig[];
  systemKeys?: KeyPair;
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
  }): Promise<void>;
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
  refresh(): void;
}

export const useGigs = create<GigsState>((set, get) => ({
  gigs: [],
  async init() {
    // Generate or retrieve system keys for platform operations
    const systemKeys = await get().getOrCreateSystemKeys();
    gigService.setSystemKeys(systemKeys);

    // Set up callback to update store when gigs change
    gigService.setOnChangeCallback(() => {
      set({ gigs: gigService.list() });
    });

    gigService.startWatchers();
    set({ systemKeys, gigs: gigService.list() });
  },

  async getOrCreateSystemKeys(): Promise<KeyPair> {
    const STORAGE_KEY = 'lightning-gig-system-keys';

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
          console.warn('Failed to parse stored gig system keys:', error);
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

  async createGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.create({ ...input, sponsorKeys });
    set({ gigs: gigService.list() });
  },

  async applyToGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const applicantKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.apply({ ...input, applicantKeys });
    set({ gigs: gigService.list() });
  },

  async selectApplication(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.selectApplication({ ...input, sponsorKeys });
    set({ gigs: gigService.list() });
  },

  async fundMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    const result = await gigService.fundMilestone({ ...input, sponsorKeys });
    set({ gigs: gigService.list() });
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
    set({ gigs: gigService.list() });
  },

  async reviewMilestone(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.reviewMilestone({ ...input, sponsorKeys });
    set({ gigs: gigService.list() });
  },

  async cancelGig(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');
    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };
    await gigService.cancelGig({ ...input, sponsorKeys });
    set({ gigs: gigService.list() });
  },

  refresh() {
    set({ gigs: gigService.list() });
  },

  resetSystemKeys() {
    const STORAGE_KEY = 'lightning-gig-system-keys';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    const newSystemKeys = nostrService.generateKeys();
    gigService.setSystemKeys(newSystemKeys);
    set({ systemKeys: newSystemKeys });
  },
}));
