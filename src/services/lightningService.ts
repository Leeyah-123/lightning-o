import { v4 as uuidv4 } from 'uuid';

// Bitnob API Configuration (server-side only)
const BITNOB_WEBHOOK_SECRET = process.env.BITNOB_WEBHOOK_SECRET;

// Types
export type FundingRequest = {
  bountyId: string;
  amountSats: number;
  sponsorPubkey: string;
};

export type FundingResult = {
  success: boolean;
  escrowTxId?: string;
  lightningInvoice?: string;
  error?: string;
};

export type Payout = {
  pubkey: string;
  amountSats: number;
  rank: number;
  lightningAddress: string;
};

export type PayoutResult = {
  success: boolean;
  proofs: Array<{ pubkey: string; proof: string; txId?: string }>;
  errors?: Array<{ pubkey: string; error: string }>;
};

export type LightningInvoice = {
  paymentRequest: string;
  paymentHash: string;
  amount: number;
  expiresAt: number;
  description?: string;
};

export type LightningPayment = {
  paymentHash: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  txId?: string;
  error?: string;
};

// Bitnob API Response Types
export type BitnobCreateInvoiceResponse = {
  status: boolean;
  message: string;
  data: {
    description: string;
    request: string;
    tokens: string;
  };
};

export type BitnobDecodePaymentResponse = {
  status: boolean;
  message: string;
  data: {
    chain_address: string;
    cltv_delta: number;
    created_at: string;
    description: string;
    destination: string;
    expires_at: string;
    features: Array<{
      bit: number;
      is_known: boolean;
      is_required: boolean;
      type: string;
    }>;
    id: string;
    is_expired: boolean;
    mtokens: string;
    payment: string;
    routes: any[];
    safe_tokens: number;
    tokens: number;
  };
};

export type BitnobWebhookPayload = {
  event: string;
  data: {
    id: string;
    request: string;
    tokens: string;
    status: string;
    created_at: string;
    paid_at?: string;
  };
};

type Listener = (event: {
  type: 'funded' | 'payouts' | 'payment_status';
  data: any;
}) => void;

class LightningService {
  private listeners: Set<Listener> = new Set();

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Create a Lightning invoice for bounty funding
  async createInvoice(
    amountSats: number,
    description: string,
    customerEmail: string = 'bounty@lightning.app',
    expiresAt?: string
  ): Promise<LightningInvoice> {
    try {
      const response = await fetch('/api/lightning/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          satoshis: amountSats,
          customerEmail,
          description,
          ...(expiresAt && { expiresAt }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${
            errorData.error || 'Unknown error'
          }`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      return data.data;
    } catch (error) {
      console.error('Failed to create Lightning invoice:', error);
      throw new Error('Failed to create Lightning invoice');
    }
  }

  // Fund a bounty escrow by creating a Lightning invoice
  async fundEscrow(req: FundingRequest): Promise<FundingResult> {
    try {
      const invoice = await this.createInvoice(
        req.amountSats,
        `Bounty funding: ${req.bountyId}`,
        `bounty-${req.bountyId}@lightning.app`
      );

      // Return the invoice for user to pay
      // The payment will be confirmed via webhook when actually paid
      return {
        success: true,
        lightningInvoice: invoice.paymentRequest,
        escrowTxId: invoice.paymentHash,
      };
    } catch (error) {
      console.error('Failed to fund escrow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send Lightning payments to winners
  async releasePayouts(
    bountyId: string,
    payouts: Payout[]
  ): Promise<PayoutResult> {
    try {
      const results = await Promise.allSettled(
        payouts.map((payout) => this.sendLightningPayment(payout))
      );

      const proofs: Array<{ pubkey: string; proof: string; txId?: string }> =
        [];
      const errors: Array<{ pubkey: string; error: string }> = [];

      results.forEach((result, index) => {
        const payout = payouts[index];
        if (result.status === 'fulfilled') {
          proofs.push({
            pubkey: payout.pubkey,
            proof: result.value.paymentHash,
            txId: result.value.txId,
          });
        } else {
          errors.push({
            pubkey: payout.pubkey,
            error: result.reason?.message || 'Payment failed',
          });
        }
      });

      // Emit event for successful payouts
      if (proofs.length > 0) {
        this.emit({
          type: 'payouts',
          data: { bountyId, proofs },
        });
      }

      return {
        success: proofs.length > 0,
        proofs,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Failed to release payouts:', error);
      return {
        success: false,
        proofs: [],
        errors: [{ pubkey: 'unknown', error: 'Failed to process payouts' }],
      };
    }
  }

  // Send a single Lightning payment
  private async sendLightningPayment(
    payout: Payout
  ): Promise<LightningPayment> {
    try {
      const response = await fetch('/api/lightning/send-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lightningAddress: payout.lightningAddress,
          amountSats: payout.amountSats,
          description: `Bounty payout - Rank ${payout.rank}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Payment failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send payment');
      }

      return {
        paymentHash: data.data.paymentHash || uuidv4(),
        amount: payout.amountSats,
        status: 'completed',
        txId: data.data.txId,
      };
    } catch (error) {
      console.error(
        `Failed to send payment to ${payout.lightningAddress}:`,
        error
      );
      return {
        paymentHash: uuidv4(),
        amount: payout.amountSats,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Decode payment request to get payment details
  async decodePaymentRequest(
    paymentRequest: string
  ): Promise<BitnobDecodePaymentResponse['data']> {
    try {
      const response = await fetch('/api/lightning/decode-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: paymentRequest,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${
            errorData.error || 'Unknown error'
          }`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to decode payment request');
      }

      return data.data;
    } catch (error) {
      console.error('Failed to decode payment request:', error);
      throw new Error('Failed to decode payment request');
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!BITNOB_WEBHOOK_SECRET) {
      console.warn('No webhook secret configured, skipping validation');
      return true; // Allow in development
    }

    try {
      // Bitnob typically uses HMAC-SHA256 for webhook validation
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', BITNOB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Failed to validate webhook signature:', error);
      return false;
    }
  }

  // Process webhook payload
  processWebhookPayload(payload: BitnobWebhookPayload): {
    type: 'funded' | 'payouts' | 'payment_status';
    data: any;
  } {
    switch (payload.event) {
      case 'payment.completed':
        return {
          type: 'funded',
          data: {
            paymentHash: payload.data.id,
            amount: parseInt(payload.data.tokens),
            paidAt: payload.data.paid_at,
            request: payload.data.request,
          },
        };
      case 'payment.failed':
        return {
          type: 'payment_status',
          data: {
            paymentHash: payload.data.id,
            status: 'failed',
            request: payload.data.request,
          },
        };
      default:
        throw new Error(`Unknown webhook event: ${payload.event}`);
    }
  }

  // Validate Lightning address format
  validateLightningAddress(address: string): boolean {
    // Basic Lightning address validation
    // Format: user@domain.com
    const lightningAddressRegex =
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return lightningAddressRegex.test(address);
  }

  // Get Lightning address info
  async getLightningAddressInfo(address: string): Promise<{
    valid: boolean;
    domain?: string;
    username?: string;
  }> {
    if (!this.validateLightningAddress(address)) {
      return { valid: false };
    }

    const [username, domain] = address.split('@');
    return {
      valid: true,
      domain,
      username,
    };
  }

  // Pay a Lightning invoice using Bitnob API
  async payInvoice(
    request: string,
    reference: string,
    customerEmail: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/lightning/pay-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request,
          reference,
          customerEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${
            errorData.error || 'Unknown error'
          }`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to pay invoice');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Failed to pay Lightning invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private emit(evt: {
    type: 'funded' | 'payouts' | 'payment_status';
    data: any;
  }) {
    this.listeners.forEach((l) => l(evt));
  }

  // Public method to emit events (for webhook processing)
  public emitEvent(evt: {
    type: 'funded' | 'payouts' | 'payment_status';
    data: any;
  }) {
    this.emit(evt);
  }
}

export const lightningService = new LightningService();
