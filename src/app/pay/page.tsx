'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lightningService } from '@/services/lightningService';
import { CheckCircle, Copy, ExternalLink, QrCode, Zap } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export default function PayPage() {
  const [invoice, setInvoice] = useState('');
  const [reference, setReference] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Generate QR code for the invoice
  useEffect(() => {
    if (invoice && invoice.startsWith('ln')) {
      const generateQRCode = async () => {
        try {
          const dataUrl = await QRCode.toDataURL(invoice, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'M',
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        }
      };

      generateQRCode();
    }
  }, [invoice]);

  const handlePay = async () => {
    if (!invoice || !reference || !customerEmail) {
      setError('Please fill in all fields');
      return;
    }

    setIsPaying(true);
    setError('');
    setPaymentResult(null);

    try {
      const result = await lightningService.payInvoice(
        invoice,
        reference,
        customerEmail
      );

      if (result.success) {
        setPaymentResult(result.data);
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
    }
  };

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
    } catch (error) {
      console.error('Failed to copy reference:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pay Lightning Invoice</h1>
        <p className="text-muted-foreground">
          Use the Bitnob API to pay Lightning invoices
        </p>
      </div>

      <div className="space-y-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice">Lightning Invoice</Label>
              <div className="flex gap-2">
                <Textarea
                  id="invoice"
                  placeholder="lnbc..."
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInvoice}
                  disabled={!invoice}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <div className="flex gap-2">
                <Input
                  id="reference"
                  placeholder="Enter payment reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyReference}
                  disabled={!reference}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Customer Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            <Button
              onClick={handlePay}
              disabled={isPaying || !invoice || !reference || !customerEmail}
              className="w-full"
            >
              {isPaying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Pay Invoice
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {qrCodeDataUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Invoice QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center border-2 border-border shadow-sm mx-auto">
                <img
                  src={qrCodeDataUrl}
                  alt="Lightning Invoice QR Code"
                  className="w-full h-full object-contain rounded"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Scan with a Lightning wallet to view invoice details
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Result */}
        {paymentResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Payment Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Reference</Label>
                  <p className="font-mono">{paymentResult.reference}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="capitalize">{paymentResult.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount (BTC)</Label>
                  <p>{paymentResult.btcAmount} BTC</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount (Sats)</Label>
                  <p>{paymentResult.satAmount} sats</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fees</Label>
                  <p>{paymentResult.satFees} sats</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Spot Price</Label>
                  <p>${paymentResult.spotPrice}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Channel</Label>
                  <p className="capitalize">{paymentResult.channel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p className="capitalize">{paymentResult.action}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-muted-foreground">Transaction ID</Label>
                <p className="font-mono text-sm break-all">
                  {paymentResult.id}
                </p>
              </div>

              <div className="pt-2">
                <Label className="text-muted-foreground">Created At</Label>
                <p className="text-sm">
                  {new Date(paymentResult.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>API Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Endpoint:</strong> POST /v1/wallet/ln/pay
            </p>
            <p>
              <strong>Required Fields:</strong> request, reference,
              customerEmail
            </p>
            <p>
              <strong>Response:</strong> Payment transaction details including
              amount, fees, and status
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://docs.bitnob.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Bitnob API Docs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
