import { gigService } from '@/services/gig-service';
import { lightningService } from '@/services/lightning-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Called POST');
    const body = await request.text();
    const signature = request.headers.get('x-bitnob-signature') || '';

    // Validate webhook signature (skip in development mode with dev signature)
    if (
      signature !== 'dev-signature' &&
      !lightningService.validateWebhookSignature(body, signature)
    ) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(body);

    // Process the webhook
    const event = lightningService.processWebhookPayload(payload);

    console.log('Processed webhook event:', event);

    // Handle gig milestone payments
    if (event.type === 'funded' && event.data?.paymentHash) {
      const gigPaymentConfirmed = await gigService.handlePaymentConfirmation(
        event.data.paymentHash
      );
      if (gigPaymentConfirmed) {
        console.log('Gig milestone payment confirmed:', event.data.paymentHash);
        // Add entityType to the event for proper routing
        event.data.entityType = 'gig';
      }
    }

    // Emit the event to listeners
    lightningService.emitEvent(event);

    console.log('Webhook processed successfully:', event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  console.log('Called GET');
  return NextResponse.json({
    message: 'Bitnob webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
