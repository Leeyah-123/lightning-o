import type {
  BountyContent,
  NostrEventBase,
  NostrEventKind,
} from '@/types/nostr';
import { getKindNumber } from '@/types/nostr';
import {
  Event,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  SimplePool,
  verifyEvent,
} from 'nostr-tools';

export interface NostrKeys {
  sk: string; // hex
  pk: string; // hex
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
    const skHex = Buffer.from(skBytes).toString('hex');
    const pk = getPublicKey(skBytes);
    return { sk: skHex, pk };
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

    const unsigned = {
      kind: kindNumber,
      created_at,
      tags,
      content: JSON.stringify(content),
      pubkey: keys.pk,
    };

    const sk = Buffer.from(keys.sk, 'hex');
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
}

export const nostrService = new NostrService([
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social',
]);
