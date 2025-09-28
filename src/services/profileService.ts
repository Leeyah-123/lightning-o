import type { NostrProfile } from '@/types/auth';
import { bech32 } from 'bech32';
import {
  finalizeEvent,
  getPublicKey,
  SimplePool,
  verifyEvent,
} from 'nostr-tools';

class ProfileService {
  private cache = new Map<string, NostrProfile>();
  private pool: SimplePool;
  private relays = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.snort.social',
  ];

  constructor() {
    this.pool = new SimplePool();
  }

  async fetchProfile(pubkey: string): Promise<NostrProfile | null> {
    if (this.cache.has(pubkey)) {
      return this.cache.get(pubkey)!;
    }

    try {
      // Fetch profile from Nostr relays
      const profile = await this.pool.get(this.relays, {
        kinds: [0],
        authors: [pubkey],
        limit: 1,
      });
      console.log('profile', profile);

      if (profile) {
        const content = JSON.parse(profile.content);
        const nostrProfile: NostrProfile = {
          name:
            content.name ||
            content.display_name ||
            `User ${pubkey.slice(0, 8)}`,
          display_name:
            content.display_name ||
            content.name ||
            `User ${pubkey.slice(0, 8)}`,
          about: content.about || 'Lightning bounty hunter',
          picture:
            content.picture ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${pubkey}`,
          banner: content.banner,
          website: content.website,
          lud16: content.lud16,
          nip05: content.nip05,
          created_at: profile.created_at,
          updated_at: profile.created_at,
        };

        this.cache.set(pubkey, nostrProfile);
        return nostrProfile;
      }

      // Fallback to generated profile if not found on relays
      const fallbackProfile: NostrProfile = {
        name: `User ${pubkey.slice(0, 8)}`,
        display_name: `User ${pubkey.slice(0, 8)}`,
        about: 'Lightning bounty hunter',
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pubkey}`,
        website: 'https://lightning.app',
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      };

      this.cache.set(pubkey, fallbackProfile);
      return fallbackProfile;
    } catch (error) {
      console.error('Failed to fetch profile:', error);

      // Return fallback profile on error
      const fallbackProfile: NostrProfile = {
        name: `User ${pubkey.slice(0, 8)}`,
        display_name: `User ${pubkey.slice(0, 8)}`,
        about: 'Lightning bounty hunter',
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pubkey}`,
        website: 'https://lightning.app',
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      };

      this.cache.set(pubkey, fallbackProfile);
      return fallbackProfile;
    }
  }

  async updateProfile(
    pubkey: string,
    profile: Partial<NostrProfile>
  ): Promise<void> {
    const existing = this.cache.get(pubkey) || {};
    const updated = { ...existing, ...profile, updated_at: Date.now() / 1000 };
    this.cache.set(pubkey, updated);
  }

  async publishProfile(
    secretKey: string,
    profile: NostrProfile
  ): Promise<void> {
    try {
      const skBytes = new Uint8Array(
        secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
      const pubkey = getPublicKey(skBytes);

      const unsignedEvent = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(profile),
        pubkey,
      };

      // Sign the event
      const signedEvent = finalizeEvent(unsignedEvent, skBytes);

      // Verify the signature
      if (!verifyEvent(signedEvent)) {
        throw new Error('Failed to verify event signature');
      }

      // Publish to relays
      await this.pool.publish(this.relays, signedEvent);

      // Update cache
      this.cache.set(pubkey, profile);
    } catch (error) {
      console.error('Failed to publish profile:', error);
      throw error;
    }
  }

  cleanup(): void {
    this.pool.close(this.relays);
  }

  validateSecretKey(secretKey: string): boolean {
    try {
      // Check if it's a bech32 encoded nsec key
      if (secretKey.startsWith('nsec1')) {
        const { words } = bech32.decode(secretKey);
        const skBytes = new Uint8Array(bech32.fromWords(words));
        getPublicKey(skBytes);
        return true;
      }

      // Check if it's a raw hex string (64 characters)
      if (/^[a-fA-F0-9]{64}$/.test(secretKey)) {
        const skBytes = new Uint8Array(
          secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );
        getPublicKey(skBytes);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  getPublicKeyFromSecret(secretKey: string): string {
    let skBytes: Uint8Array;

    if (secretKey.startsWith('nsec1')) {
      // Decode bech32 nsec key
      const { words } = bech32.decode(secretKey);
      skBytes = new Uint8Array(bech32.fromWords(words));
    } else {
      // Assume it's a hex string
      skBytes = new Uint8Array(
        secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
    }

    return getPublicKey(skBytes);
  }

  // Helper method to convert public key to npub format
  getNpubFromPubkey(pubkey: string): string {
    const words = bech32.toWords(Buffer.from(pubkey, 'hex'));
    return bech32.encode('npub', words);
  }

  // Helper method to convert secret key to nsec format
  getNsecFromSecretKey(secretKey: string): string {
    let skBytes: Uint8Array;

    if (secretKey.startsWith('nsec1')) {
      // Already in nsec format
      return secretKey;
    } else {
      // Convert hex to nsec
      skBytes = new Uint8Array(
        secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
    }

    const words = bech32.toWords(skBytes);
    return bech32.encode('nsec', words);
  }

  // Helper method to convert npub back to hex format (for internal use)
  getHexFromNpub(npub: string): string {
    if (npub.startsWith('npub1')) {
      const { words } = bech32.decode(npub);
      const bytes = new Uint8Array(bech32.fromWords(words));
      return Buffer.from(bytes).toString('hex');
    }
    return npub; // Assume it's already hex
  }

  // Helper method to convert nsec back to hex format (for internal use)
  getHexFromNsec(nsec: string): string {
    if (nsec.startsWith('nsec1')) {
      const { words } = bech32.decode(nsec);
      const bytes = new Uint8Array(bech32.fromWords(words));
      return Buffer.from(bytes).toString('hex');
    }
    return nsec; // Assume it's already hex
  }
}

export const profileService = new ProfileService();
