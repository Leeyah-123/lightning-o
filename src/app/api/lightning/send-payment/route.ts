import { NextRequest, NextResponse } from 'next/server';

const BITNOB_API_BASE =
  process.env.NEXT_PUBLIC_BITNOB_API_URL || 'https://api.bitnob.com';
const BITNOB_API_KEY = process.env.BITNOB_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lightningAddress, amountSats, description } = body;

    if (!lightningAddress || !amountSats) {
      return NextResponse.json(
        { error: 'Missing required fields: lightningAddress, amountSats' },
        { status: 400 }
      );
    }

    // Development mode fallback
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Simulating Lightning payment');

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return mock success response
      return NextResponse.json({
        success: true,
        data: {
          id: `dev-payment-${Date.now()}`,
          amount: amountSats,
          status: 'completed',
          paymentHash: `dev-hash-${Date.now()}`,
          txId: `dev-tx-${Date.now()}`,
          lightningAddress,
          description: description || 'Bounty payout',
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Production mode - use real Bitnob API
    if (!BITNOB_API_KEY) {
      return NextResponse.json(
        { error: 'Bitnob API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${BITNOB_API_BASE}/v1/lightning/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BITNOB_API_KEY}`,
      },
      body: JSON.stringify({
        lightningAddress,
        amountSats,
        description: description || 'Bounty payout',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: `Bitnob API error: ${response.status} ${response.statusText}`,
          details: errorData.message || 'Unknown error',
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { error: data.message || 'Failed to send payment' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error('Failed to send Lightning payment:', error);
    return NextResponse.json(
      { error: 'Failed to send Lightning payment' },
      { status: 500 }
    );
  }
}
