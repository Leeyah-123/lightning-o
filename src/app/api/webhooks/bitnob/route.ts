import { gigService } from '@/services/gig-service';
import { grantService } from '@/services/grant-service';
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

    const { paymentHash } = event.data as {
      entityType: 'gig' | 'grant' | 'bounty';
      paymentHash: string;
    };

    // Handle gig milestone payments
    if (event.type === 'funded' && paymentHash) {
      const gigPaymentConfirmed = await gigService.handlePaymentConfirmation(
        paymentHash
      );
      if (gigPaymentConfirmed) {
        console.log('Gig milestone payment confirmed:', paymentHash);
      } else {
        // Try grant tranche payments
        const grantPaymentConfirmed =
          await grantService.handlePaymentConfirmation(paymentHash);
        if (grantPaymentConfirmed) {
          console.log('Grant tranche payment confirmed:', paymentHash);
        }
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
