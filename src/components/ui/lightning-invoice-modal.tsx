'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { CheckCircle, Copy, QrCode, Zap } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface LightningInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lightningInvoice: string;
  amountSats: number;
  title: string;
  description?: string;
  onDevPayment?: () => Promise<void>; // Custom dev payment handler
  onPaymentComplete?: () => void;
}

export function LightningInvoiceModal({
  isOpen,
  onClose,
  lightningInvoice,
  amountSats,
  title,
  description,
  onDevPayment,
  onPaymentComplete,
}: LightningInvoiceModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeError, setQrCodeError] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Generate QR code when invoice changes
  useEffect(() => {
    if (lightningInvoice && isOpen) {
      // Reset payment state when modal opens
      setPaymentSuccess(false);
      setIsPaying(false);

      const generateQRCode = async () => {
        try {
          setQrCodeError('');
          const dataUrl = await QRCode.toDataURL(lightningInvoice, {
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
          setQrCodeError('Failed to generate QR code');
        }
      };

      generateQRCode();
    }
  }, [lightningInvoice, isOpen]);

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(lightningInvoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
    }
  };

  const handleDownloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `lightning-invoice-${amountSats}sats-qr.png`;
      link.href = qrCodeDataUrl;
      document.body?.appendChild(link);
      link.click();
      document.body?.removeChild(link);
    }
  };

  const handleDevPayment = async () => {
    if (process.env.NODE_ENV === 'production') return;

    setIsPaying(true);
    try {
      // Call the custom dev payment handler if provided
      if (onDevPayment) {
        await onDevPayment();
      } else {
        // Fallback: simulate payment by calling the pay invoice API
        const response = await fetch('/api/lightning/pay-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request: lightningInvoice,
            reference: `dev-payment-${Date.now()}`,
            customerEmail: 'dev@lightning.app',
          }),
        });

        if (!response.ok) {
          console.error('Dev payment failed:', await response.text());
          return;
        }
      }

      setPaymentSuccess(true);

      // Call payment complete callback
      onPaymentComplete?.();

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Dev payment error:', error);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-xl">{title}</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Pay {amountSats.toLocaleString()} sats
              {description && ` ${description}`}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center border-2 border-border shadow-sm">
                  {qrCodeError ? (
                    <div className="text-center text-red-500">
                      <QrCode className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">{qrCodeError}</p>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <Image
                      src={qrCodeDataUrl}
                      alt="Lightning Invoice QR Code"
                      className="w-full h-full object-contain rounded"
                      width={256}
                      height={256}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <QrCode className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Generating QR Code...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Actions */}
              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQRCode}
                    className="text-xs"
                  >
                    <QrCode className="h-3 w-3 mr-1" />
                    Download QR Code
                  </Button>
                </div>
              )}
            </div>

            {/* Lightning Invoice */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lightning Invoice</label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {lightningInvoice}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInvoice}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <span className="text-green-600">Copied!</span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h4 className="font-medium">How to pay:</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <span>
                    Copy the Lightning invoice above or scan the QR code
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <span>
                    Open your Lightning wallet (e.g., Phoenix, Breez, Zeus)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <span>Paste the invoice and confirm the payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    4
                  </span>
                  <span>Wait for payment confirmation (usually instant)</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {process.env.NODE_ENV !== 'production' && (
                <Button
                  onClick={handleDevPayment}
                  disabled={!lightningInvoice || isPaying || paymentSuccess}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isPaying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : paymentSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Paid!
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Pay (Dev)
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="text-center">
              {paymentSuccess ? (
                <p className="text-sm text-green-600 font-medium">
                  Payment completed successfully! Modal will close
                  automatically.
                </p>
              ) : process.env.NODE_ENV !== 'production' ? (
                <p className="text-sm text-muted-foreground">
                  Development mode: Click &quot;Pay (Dev)&quot; to simulate
                  payment
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Payment will be confirmed automatically once received
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
}
