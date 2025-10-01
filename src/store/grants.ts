'use client';

import { grantService } from '@/services/grant-service';
import type { Grant } from '@/types/grant';
import { create } from 'zustand';
import { useAuth } from './auth';

export type KeyPair = { sk: string; pk: string };

interface GrantsState {
  grants: Grant[];
  isLoading: boolean;
  error: string | null;
  systemKeys?: KeyPair;
  unsubscribe?: () => void;
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
      amount: number;
      maxAmount?: number;
      description: string;
    }>;
  }): Promise<Grant>;
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
  refresh(): Promise<void>;
}

export const useGrants = create<GrantsState>((set) => ({
  grants: [],
  isLoading: false,
  error: null,
  systemKeys: undefined,

  async init() {
    try {
      set({ isLoading: true, error: null });

      // Initialize grant service directly
      grantService.startWatchers();

      // Get data from service
      const grants = grantService.list();
      set({
        grants,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize grants:', error);
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
      if (!response.ok) {
        throw new Error('Failed to fetch system keys');
      }
      const { privateKey, publicKey } = await response.json();
      return { sk: privateKey, pk: publicKey };
    } catch (error) {
      console.error('Failed to get system keys:', error);
      throw error;
    }
  },

  resetSystemKeys() {
    set({ systemKeys: undefined });
  },

  async createGrant(input): Promise<Grant> {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.createGrant({ ...input, sponsorKeys });
    if (!result.success || !result.grant) {
      throw new Error(result.error || 'Failed to create grant');
    }

    return result.grant;
    // Cache will be updated via the onChangeCallback
  },

  async applyToGrant(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const applicantKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.applyToGrant({ ...input, applicantKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to apply to grant');
    }

    // Cache will be updated via the onChangeCallback
  },

  async selectApplication(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.selectApplication({
      ...input,
      sponsorKeys,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to select application');
    }

    // Cache will be updated via the onChangeCallback
  },

  async fundTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.fundTranche({ ...input, sponsorKeys });
    // Cache will be updated via the onChangeCallback
    return result;
  },

  async submitTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const submitterKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.submitTranche({
      ...input,
      submitterKeys,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to submit tranche');
    }

    // Cache will be updated via the onChangeCallback
  },

  async reviewTranche(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.reviewTranche({ ...input, sponsorKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to review tranche');
    }

    // Cache will be updated via the onChangeCallback
  },

  async cancelGrant(input) {
    const { user } = useAuth.getState();
    if (!user) throw new Error('Not authenticated');

    const sponsorKeys = {
      sk: user.secretKey,
      pk: user.pubkey,
    };

    const result = await grantService.cancelGrant({ ...input, sponsorKeys });
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel grant');
    }

    // Cache will be updated via the onChangeCallback
  },

  async refresh() {
    // Re-initialize the service
    set({ isLoading: true, error: null });
    try {
      grantService.startWatchers();
      const grants = grantService.list();
      set({ grants, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },
}));
