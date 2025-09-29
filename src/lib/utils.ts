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

// Date-time conversion utilities for datetime-local inputs
export function timestampToDatetimeLocal(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';

  const date = new Date(timestamp);
  // Convert to local time for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function datetimeLocalToTimestamp(datetimeLocal: string): number {
  if (!datetimeLocal) return 0;

  // Create date in local timezone
  const localDate = new Date(datetimeLocal);
  return localDate.getTime();
}

// Ordinal number formatting utility
export function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  // Handle special cases for 11th, 12th, 13th
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  // Handle regular cases
  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function formatOrdinal(num: number): string {
  return `${num}${getOrdinalSuffix(num)}`;
}
