import { bech32 } from 'bech32';
import { NextResponse } from 'next/server';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

export async function GET() {
  try {
    const systemPrivateKey = process.env.SYSTEM_PRIVATE_KEY;

    if (!systemPrivateKey) {
      // Generate new system keys if not set
      const privateKeyBytes = generateSecretKey();
      const publicKeyBytes = getPublicKey(privateKeyBytes);

      // Convert to bech32 format
      // generateSecretKey returns Uint8Array, getPublicKey returns hex string
      const privateKeyBuffer = Buffer.from(privateKeyBytes);
      const publicKeyBuffer = Buffer.from(publicKeyBytes, 'hex');

      const privateKey = bech32.encode(
        'nsec',
        bech32.toWords(privateKeyBuffer)
      );
      const publicKey = bech32.encode('npub', bech32.toWords(publicKeyBuffer));

      console.log(`
        Generated system keys:
        System private key: ${privateKey}
        System public key: ${publicKey}
        `);

      return NextResponse.json({
        privateKey,
        publicKey,
        generated: true,
      });
    }

    // Convert private key to bytes
    let privateKeyBytes: Uint8Array;
    if (systemPrivateKey.startsWith('nsec')) {
      // Decode bech32 format
      const { words } = bech32.decode(systemPrivateKey);
      privateKeyBytes = new Uint8Array(bech32.fromWords(words));
    } else {
      // Decode hex format
      privateKeyBytes = Buffer.from(systemPrivateKey, 'hex');
    }

    // Generate public key
    const publicKeyBytes = getPublicKey(privateKeyBytes);

    // Convert public key to bech32 format
    // getPublicKey returns a hex string, so we need to convert it to bytes first
    const publicKeyBuffer = Buffer.from(publicKeyBytes, 'hex');
    const systemPublicKey = bech32.encode(
      'npub',
      bech32.toWords(publicKeyBuffer)
    );

    return NextResponse.json({
      privateKey: systemPrivateKey,
      publicKey: systemPublicKey,
      generated: false,
    });
  } catch (error) {
    console.error('Error getting system keys:', error);
    return NextResponse.json(
      { error: 'Failed to get system keys' },
      { status: 500 }
    );
  }
}
