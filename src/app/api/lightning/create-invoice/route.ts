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
    const { satoshis, customerEmail, description, expiresAt } = body;

    if (!satoshis || !customerEmail || !description) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: satoshis, customerEmail, description',
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BITNOB_API_BASE}/v1/wallets/ln/createinvoice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BITNOB_API_KEY}`,
        },
        body: JSON.stringify({
          satoshis,
          customerEmail,
          description,
          ...(expiresAt && { expiresAt }),
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
        { error: data.message || 'Failed to create invoice' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentRequest: data.data.request,
        paymentHash: data.data.id,
        amount: parseInt(data.data.tokens),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours default
        description: data.data.description,
      },
    });
  } catch (error) {
    console.error('Failed to create Lightning invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create Lightning invoice' },
      { status: 500 }
    );
  }
}
