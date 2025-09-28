import { NextResponse } from 'next/server';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

export async function GET() {
  try {
    const systemPrivateKey = process.env.SYSTEM_PRIVATE_KEY;

    if (!systemPrivateKey) {
      // Generate new system keys if not set
      const newPrivateKey = generateSecretKey();
      const newPublicKey = getPublicKey(newPrivateKey);

      return NextResponse.json({
        privateKey: newPrivateKey,
        publicKey: newPublicKey,
        generated: true,
      });
    }

    const systemPublicKey = getPublicKey(Buffer.from(systemPrivateKey, 'hex'));

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
