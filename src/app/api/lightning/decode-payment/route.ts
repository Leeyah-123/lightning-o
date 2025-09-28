import { NextRequest, NextResponse } from 'next/server';

const BITNOB_API_BASE =
  process.env.NEXT_PUBLIC_BITNOB_API_URL || 'https://api.bitnob.com';
const BITNOB_API_KEY = process.env.BITNOB_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!BITNOB_API_KEY) {
      return NextResponse.json(
        { error: 'Bitnob API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { request: paymentRequest } = body;

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Missing required field: request' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BITNOB_API_BASE}/v1/wallets/ln/decodepaymentrequest`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BITNOB_API_KEY}`,
        },
        body: JSON.stringify({
          request: paymentRequest,
        }),
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
        { error: data.message || 'Failed to decode payment request' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error('Failed to decode payment request:', error);
    return NextResponse.json(
      { error: 'Failed to decode payment request' },
      { status: 500 }
    );
  }
}
