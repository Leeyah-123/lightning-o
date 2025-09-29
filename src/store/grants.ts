'use client';

import { grantService } from '@/services/grant-service';
import { profileService } from '@/services/profile-service';
import type { Grant } from '@/types/grant';
import { create } from 'zustand';
import { useAuth } from './auth';

export type KeyPair = { sk: string; pk: string };

interface GrantsState {
  grants: Grant[];
  systemKeys?: KeyPair;
  init(): Promise<void>;
  getOrCreateSystemKeys(): Promise<KeyPair>;
  resetSystemKeys(): void;
  createGrant(input: {
    title: string;
    shortDescription: string;
    description: string;
    reward: {
      type: 'fixed' | 'range';
      amount: number;
      maxAmount?: number;
    };
    tranches: Array<{
      amountSats: number;
      description: string;
    }>;
  }): Promise<void>;
  applyToGrant(input: {
    grantId: string;
    portfolioLink?: string;
    proposal: string;
    budgetRequest?: number;
  }): Promise<void>;
  selectApplication(input: {
    grantId: string;
    applicationId: string;
    finalAllocation?: number;
  }): Promise<void>;
  fundTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
  }): Promise<{
    success: boolean;
    lightningInvoice?: string;
    paymentHash?: string;
    error?: string;
  }>;
  submitTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
    content: string;
    links?: string[];
  }): Promise<void>;
  reviewTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
  }): Promise<void>;
  cancelGrant(input: { grantId: string; reason?: string }): Promise<void>;
}

export const useGrants = create<GrantsState>((set, get) => ({
  grants: [],
  systemKeys: undefined,

  async init() {
    try {
      const systemKeys = await get().getOrCreateSystemKeys();
      grantService.setSystemKeys(systemKeys);
      grantService.setOnChangeCallback(() => {
        set({ grants: grantService.list() });
      });
      set({ grants: grantService.list() });
    } catch (error) {
      console.error('Failed to initialize grants:', error);
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
      if (!response.ok) {
        throw new Error('Failed to fetch system keys');
      }
      const keys = await response.json();

      // Store in localStorage for future use
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      }

      return keys;
    } catch (error) {
      console.error('Failed to get system keys:', error);
      throw error;
    }
  },

  resetSystemKeys() {
    set({ systemKeys: undefined });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lightning-system-keys');
    }
  },

  async createGrant(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.createGrant({ ...input, sponsorKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to create grant');
    }

    set({ grants: grantService.list() });
  },

  async applyToGrant(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const applicantKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.applyToGrant({ ...input, applicantKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to apply to grant');
    }

    set({ grants: grantService.list() });
  },

  async selectApplication(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.selectApplication({
      ...input,
      sponsorKeys,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to select application');
    }

    set({ grants: grantService.list() });
  },

  async fundTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.fundTranche({ ...input, sponsorKeys });
    set({ grants: grantService.list() });
    return result;
  },

  async submitTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const submitterKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.submitTranche({
      ...input,
      submitterKeys,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to submit tranche');
    }

    set({ grants: grantService.list() });
  },

  async reviewTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.reviewTranche({ ...input, sponsorKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to review tranche');
    }

    set({ grants: grantService.list() });
  },

  async cancelGrant(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: profileService.getHexFromNsec(user.secretKey),
      pk: profileService.getHexFromNpub(user.pubkey),
    };

    const result = await grantService.cancelGrant({ ...input, sponsorKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel grant');
    }

    set({ grants: grantService.list() });
  },
}));
