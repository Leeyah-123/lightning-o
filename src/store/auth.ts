'use client';

import { normalizeToNpub, normalizeToNsec } from '@/lib/utils';
import { nostrService } from '@/services/nostr-service';
import { profileService } from '@/services/profile-service';
import type { AuthState, NostrProfile, User } from '@/types/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'lightning-auth';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      login: async (secretKey: string) => {
        set({ isLoading: true });
        try {
          if (!profileService.validateSecretKey(secretKey)) {
            throw new Error('Invalid secret key format');
          }

          const pubkey = profileService.getPublicKeyFromSecret(secretKey);
          const npub = normalizeToNpub(pubkey);
          const nsec = normalizeToNsec(secretKey);
          const profile =
            (await profileService.fetchProfile(pubkey)) || undefined;

          const user: User = {
            pubkey: npub, // Store as npub format
            secretKey: nsec, // Store as nsec format
            profile,
            isAuthenticated: true,
          };

          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null });
        localStorage.removeItem(STORAGE_KEY);
      },

      updateProfile: (profile: NostrProfile) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              profile: { ...user.profile, ...profile },
            },
          });
        }
      },

      generateNewKeys: () => {
        const keys = nostrService.generateKeys();
        const npub = profileService.getNpubFromPubkey(keys.pk);
        const nsec = profileService.getNsecFromSecretKey(keys.sk);
        const user: User = {
          pubkey: npub, // Store as npub format
          secretKey: nsec, // Store as nsec format
          isAuthenticated: true,
        };
        set({ user });
      },

      exportKeys: () => {
        const { user } = get();
        if (!user) {
          throw new Error('No user logged in');
        }

        const keysData = {
          publicKey: user.pubkey,
          secretKey: user.secretKey,
          exportedAt: new Date().toISOString(),
          format: 'nostr-keys',
        };

        const blob = new Blob([JSON.stringify(keysData, null, 2)], {
          type: 'application/json',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nostr-keys-${user.pubkey.slice(0, 8)}.json`;
        document.body?.appendChild(a);
        a.click();
        document.body?.removeChild(a);
        URL.revokeObjectURL(url);
      },

      exportSecretKey: () => {
        const { user } = get();
        if (!user) {
          throw new Error('No user logged in');
        }

        const blob = new Blob([user.secretKey], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nostr-secret-key-${user.pubkey.slice(0, 8)}.txt`;
        document.body?.appendChild(a);
        a.click();
        document.body?.removeChild(a);
        URL.revokeObjectURL(url);
      },

      exportPublicKey: () => {
        const { user } = get();
        if (!user) {
          throw new Error('No user logged in');
        }

        const blob = new Blob([user.pubkey], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nostr-public-key-${user.pubkey.slice(0, 8)}.txt`;
        document.body?.appendChild(a);
        a.click();
        document.body?.removeChild(a);
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ user: state.user }),
    }
  )
);
