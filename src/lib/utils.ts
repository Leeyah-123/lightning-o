import { bech32 } from 'bech32';

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

export function truncateMiddle(
  value: string,
  start: number = 6,
  end: number = 6
): string {
  if (!value) return '';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

// Key normalization utilities
export function normalizeToNpub(pubkey: string): string {
  if (pubkey.startsWith('npub1')) {
    return pubkey; // Already in npub format
  }

  // Assume it's hex format
  const words = bech32.toWords(Buffer.from(pubkey, 'hex'));
  return bech32.encode('npub', words);
}

export function normalizeToNsec(secretKey: string): string {
  if (secretKey.startsWith('nsec1')) {
    return secretKey; // Already in nsec format
  }

  // Assume it's hex format
  const words = bech32.toWords(Buffer.from(secretKey, 'hex'));
  return bech32.encode('nsec', words);
}

export function normalizeToHex(pubkey: string): string {
  if (pubkey.startsWith('npub1')) {
    const { words } = bech32.decode(pubkey);
    const bytes = new Uint8Array(bech32.fromWords(words));
    return Buffer.from(bytes).toString('hex');
  }

  return pubkey; // Assume it's already hex
}

export function normalizeSecretKeyToHex(secretKey: string): string {
  if (secretKey.startsWith('nsec1')) {
    const { words } = bech32.decode(secretKey);
    const bytes = new Uint8Array(bech32.fromWords(words));
    return Buffer.from(bytes).toString('hex');
  }

  return secretKey; // Assume it's already hex
}

export function areKeysEqual(key1: string, key2: string): boolean {
  // Normalize both keys to hex format for comparison
  const hex1 = key1.startsWith('npub1') ? normalizeToHex(key1) : key1;
  const hex2 = key2.startsWith('npub1') ? normalizeToHex(key2) : key2;

  return hex1 === hex2;
}
