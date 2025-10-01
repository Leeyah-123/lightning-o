import { NextRequest, NextResponse } from 'next/server';

const BITNOB_API_BASE =
  process.env.NEXT_PUBLIC_BITNOB_API_URL || 'https://api.bitnob.com';
const BITNOB_API_KEY = process.env.BITNOB_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      request: paymentRequest,
      reference,
      customerEmail,
      entityType,
      entityId,
    } = body;

    if (!paymentRequest || !reference || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: request, reference, customerEmail' },
        { status: 400 }
      );
    }

    // In development mode, simulate payment by calling the webhook
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Simulating payment via webhook');

      // Create a mock webhook payload for payment completion
      const mockWebhookPayload = {
        event: 'payment.completed',
        data: {
          id: `dev-${Date.now()}`,
          reference,
          amount: '1000', // Mock amount
          status: 'completed',
          paymentRequest,
          customerEmail,
          createdAt: new Date().toISOString(),
          entityType,
          entityId,
        },
      };

      // Call the webhook endpoint directly
      const webhookResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/api/webhooks/bitnob`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bitnob-signature': 'dev-signature', // Mock signature for dev
          },
          body: JSON.stringify(mockWebhookPayload),
        }
      );

      if (!webhookResponse.ok) {
        console.error('Failed to process webhook in dev mode');
      }

      // Return mock success response
      return NextResponse.json({
        success: true,
        data: {
          id: mockWebhookPayload.data.id,
          reference,
          amount: mockWebhookPayload.data.amount,
          status: 'completed',
          paymentRequest,
          customerEmail,
          createdAt: mockWebhookPayload.data.createdAt,
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

    const response = await fetch(`${BITNOB_API_BASE}/v1/wallets/ln/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BITNOB_API_KEY}`,
      },
      body: JSON.stringify({
        request: paymentRequest,
        reference,
        customerEmail,
      }),
    });

    if (!response.ok) {
      console.log(response);
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
        { error: data.message || 'Failed to pay invoice' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error('Failed to pay Lightning invoice:', error);
    return NextResponse.json(
      { error: 'Failed to pay Lightning invoice' },
      { status: 500 }
    );
  }
}
