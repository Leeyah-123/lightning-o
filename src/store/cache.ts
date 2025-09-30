'use client';

import type { Bounty } from '@/types/bounty';
import type { Gig } from '@/types/gig';
import type { Grant } from '@/types/grant';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CacheState {
  // Data
  bounties: Bounty[];
  gigs: Gig[];
  grants: Grant[];

  // Loading states
  isLoading: {
    bounties: boolean;
    gigs: boolean;
    grants: boolean;
  };

  // Error states
  errors: {
    bounties: string | null;
    gigs: string | null;
    grants: string | null;
  };

  // Cache metadata
  lastFetched: {
    bounties: number | null;
    gigs: number | null;
    grants: number | null;
  };

  // Cache configuration
  cacheConfig: {
    ttl: number; // Time to live in milliseconds (default: 5 minutes)
    maxRetries: number;
    retryDelay: number;
  };

  // Actions
  setBounties: (bounties: Bounty[], fromCache?: boolean) => void;
  setGigs: (gigs: Gig[], fromCache?: boolean) => void;
  setGrants: (grants: Grant[], fromCache?: boolean) => void;

  setLoading: (type: 'bounties' | 'gigs' | 'grants', loading: boolean) => void;
  setError: (
    type: 'bounties' | 'gigs' | 'grants',
    error: string | null
  ) => void;

  // Cache management
  isStale: (type: 'bounties' | 'gigs' | 'grants') => boolean;
  shouldRefresh: (type: 'bounties' | 'gigs' | 'grants') => boolean;
  clearCache: (type?: 'bounties' | 'gigs' | 'grants') => void;
  clearAllCache: () => void;

  // Optimistic updates
  updateBounty: (bounty: Bounty) => void;
  updateGig: (gig: Gig) => void;
  updateGrant: (grant: Grant) => void;

  // Batch operations
  batchUpdate: (updates: {
    bounties?: Bounty[];
    gigs?: Gig[];
    grants?: Grant[];
  }) => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useCache = create<CacheState>()(
  persist(
    (set, get) => ({
      // Initial state
      bounties: [],
      gigs: [],
      grants: [],

      isLoading: {
        bounties: false,
        gigs: false,
        grants: false,
      },

      errors: {
        bounties: null,
        gigs: null,
        grants: null,
      },

      lastFetched: {
        bounties: null,
        gigs: null,
        grants: null,
      },

      cacheConfig: {
        ttl: CACHE_TTL,
        maxRetries: MAX_RETRIES,
        retryDelay: RETRY_DELAY,
      },

      // Data setters
      setBounties: (bounties, fromCache = false) => {
        set((state) => ({
          bounties,
          lastFetched: {
            ...state.lastFetched,
            bounties: fromCache ? state.lastFetched.bounties : Date.now(),
          },
          errors: {
            ...state.errors,
            bounties: null,
          },
        }));
      },

      setGigs: (gigs, fromCache = false) => {
        set((state) => ({
          gigs,
          lastFetched: {
            ...state.lastFetched,
            gigs: fromCache ? state.lastFetched.gigs : Date.now(),
          },
          errors: {
            ...state.errors,
            gigs: null,
          },
        }));
      },

      setGrants: (grants, fromCache = false) => {
        set((state) => ({
          grants,
          lastFetched: {
            ...state.lastFetched,
            grants: fromCache ? state.lastFetched.grants : Date.now(),
          },
          errors: {
            ...state.errors,
            grants: null,
          },
        }));
      },

      // Loading state setters
      setLoading: (type, loading) => {
        set((state) => ({
          isLoading: {
            ...state.isLoading,
            [type]: loading,
          },
        }));
      },

      // Error state setters
      setError: (type, error) => {
        set((state) => ({
          errors: {
            ...state.errors,
            [type]: error,
          },
        }));
      },

      // Cache validation
      isStale: (type) => {
        const state = get();
        const lastFetched = state.lastFetched[type];
        if (!lastFetched) return true;
        return Date.now() - lastFetched > state.cacheConfig.ttl;
      },

      shouldRefresh: (type) => {
        const state = get();
        return state.isStale(type) && !state.isLoading[type];
      },

      // Cache management
      clearCache: (type) => {
        if (type) {
          set((state) => ({
            [type]: [],
            lastFetched: {
              ...state.lastFetched,
              [type]: null,
            },
            errors: {
              ...state.errors,
              [type]: null,
            },
          }));
        } else {
          set({
            bounties: [],
            gigs: [],
            grants: [],
            lastFetched: {
              bounties: null,
              gigs: null,
              grants: null,
            },
            errors: {
              bounties: null,
              gigs: null,
              grants: null,
            },
          });
        }
      },

      clearAllCache: () => {
        get().clearCache();
      },

      // Optimistic updates
      updateBounty: (bounty) => {
        set((state) => ({
          bounties: state.bounties.map((b) =>
            b.id === bounty.id ? bounty : b
          ),
        }));
      },

      updateGig: (gig) => {
        set((state) => ({
          gigs: state.gigs.map((g) => (g.id === gig.id ? gig : g)),
        }));
      },

      updateGrant: (grant) => {
        set((state) => ({
          grants: state.grants.map((g) => (g.id === grant.id ? grant : g)),
        }));
      },

      // Batch operations
      batchUpdate: (updates) => {
        set((state) => ({
          bounties: updates.bounties || state.bounties,
          gigs: updates.gigs || state.gigs,
          grants: updates.grants || state.grants,
          lastFetched: {
            bounties: updates.bounties
              ? Date.now()
              : state.lastFetched.bounties,
            gigs: updates.gigs ? Date.now() : state.lastFetched.gigs,
            grants: updates.grants ? Date.now() : state.lastFetched.grants,
          },
        }));
      },
    }),
    {
      name: 'lightning-cache',
      partialize: (state) => ({
        bounties: state.bounties,
        gigs: state.gigs,
        grants: state.grants,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
