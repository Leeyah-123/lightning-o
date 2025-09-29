import type {
  BountyContent,
  GigContent,
  NostrEventBase,
  NostrEventKind,
} from '@/types/nostr';
import { getKindNumber } from '@/types/nostr';
import { bech32 } from 'bech32';
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  SimplePool,
  verifyEvent,
} from 'nostr-tools';

export interface NostrKeys {
  sk: string; // bech32 nsec format
  pk: string; // bech32 npub format
}

class NostrService {
  private pool: SimplePool;
  private relays: string[];
  private systemKeys?: NostrKeys;

  constructor(relays: string[]) {
    this.pool = new SimplePool();
    this.relays = relays;
  }

  setSystemKeys(keys: NostrKeys) {
    this.systemKeys = keys;
  }

  generateKeys(): NostrKeys {
    const skBytes = generateSecretKey();
    const pk = getPublicKey(skBytes);

    // Convert to bech32 format
    const nsec = bech32.encode('nsec', bech32.toWords(skBytes));
    const npub = bech32.encode('npub', bech32.toWords(Buffer.from(pk, 'hex')));

    return { sk: nsec, pk: npub };
  }

  async publishBountyEvent(
    keys: NostrKeys,
    kind: NostrEventKind,
    content: BountyContent,
    tags: string[][] = []
  ): Promise<NostrEventBase> {
    const created_at = Math.floor(Date.now() / 1000);

    // Convert kind string to number
    const kindNumber = getKindNumber(kind);

    // Convert bech32 keys to hex for internal use
    const pkHex = this.getHexFromNpub(keys.pk);
    const skHex = this.getHexFromNsec(keys.sk);

    const unsigned = {
      kind: kindNumber,
      created_at,
      tags,
      content: JSON.stringify(content),
      pubkey: pkHex,
    };

    const sk = Buffer.from(skHex, 'hex');
    const signed = finalizeEvent(unsigned, sk);
    if (!verifyEvent(signed)) throw new Error('Invalid signature');
    this.pool.publish(this.relays, signed);
    return signed as unknown as NostrEventBase;
  }

  async publishGigEvent(
    keys: NostrKeys,
    kind: NostrEventKind,
    content: GigContent,
    tags: string[][] = []
  ): Promise<NostrEventBase> {
    const created_at = Math.floor(Date.now() / 1000);

    // Convert kind string to number
    const kindNumber = getKindNumber(kind);

    // Convert bech32 keys to hex for internal use
    const pkHex = this.getHexFromNpub(keys.pk);
    const skHex = this.getHexFromNsec(keys.sk);

    const unsigned = {
      kind: kindNumber,
      created_at,
      tags,
      content: JSON.stringify(content),
      pubkey: pkHex,
    };

    const sk = Buffer.from(skHex, 'hex');
    const signed = finalizeEvent(unsigned, sk);
    if (!verifyEvent(signed)) throw new Error('Invalid signature');
    this.pool.publish(this.relays, signed);
    return signed as unknown as NostrEventBase;
  }

  subscribeKinds(
    kinds: NostrEventKind[],
    onEvent: (event: NostrEventBase) => void
  ) {
    // Convert kind strings to numbers
    const kindNumbers = kinds.map(getKindNumber);

    const sub = this.pool.subscribeMany(
      this.relays,
      { kinds: kindNumbers },
      {
        onevent: (ev: NostrEventBase) => {
          try {
            if (!verifyEvent(ev)) return;
            onEvent(ev);
          } catch {}
        },
      }
    );
    return () => sub.close();
  }

  async queryEvents(kinds: NostrEventKind[]): Promise<NostrEventBase[]> {
    // Convert kind strings to numbers
    const kindNumbers = kinds.map(getKindNumber);

    return new Promise((resolve) => {
      const events: NostrEventBase[] = [];

      const sub = this.pool.subscribeMany(
        this.relays,
        { kinds: kindNumbers },
        {
          onevent: (ev: NostrEventBase) => {
            try {
              if (!verifyEvent(ev)) return;
              events.push(ev);
            } catch {}
          },
          oneose: () => {
            // End of stored events
            sub.close();
            resolve(events);
          },
        }
      );

      // Set a timeout to resolve even if no events are found
      setTimeout(() => {
        sub.close();
        resolve(events);
      }, 5000); // 5 second timeout
    });
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

export const nostrService = new NostrService([
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
]);
