import { NextRequest, NextResponse } from 'next/server';

const BITNOB_API_BASE =
  process.env.NEXT_PUBLIC_BITNOB_API_URL || 'https://api.bitnob.com';
const BITNOB_API_KEY = process.env.BITNOB_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentHash = searchParams.get('paymentHash');

    if (!paymentHash) {
      return NextResponse.json(
        { error: 'Missing required parameter: paymentHash' },
        { status: 400 }
      );
    }

    // Development mode fallback
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Simulating payment status check');

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock payment status
      return NextResponse.json({
        success: true,
        data: {
          paymentHash,
          amount: 1000, // Mock amount
          status: 'completed',
          txId: `dev-tx-${paymentHash}`,
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

    const response = await fetch(
      `${BITNOB_API_BASE}/v1/lightning/payments/${paymentHash}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BITNOB_API_KEY}`,
        },
      }
    );

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
        { error: data.message || 'Failed to check payment status' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error('Failed to check payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
