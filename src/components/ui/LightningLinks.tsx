'use client';

import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface LightningLinksProps {
  address: string;
  link?: boolean;
  copy?: boolean;
  className?: string;
}

export function LightningLinks({
  address,
  link = false,
  copy = true,
  className = '',
}: LightningLinksProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleLinkClick = () => {
    // Lightning addresses can be viewed on various explorers
    // For now, we'll use a generic lightning explorer or the address itself
    const explorerUrl = `https://lightning.bitcoin.com/address/${address}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm text-muted-foreground">{address}</span>

      {copy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}

      {link && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLinkClick}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}

      {copied && (
        <span className="text-xs text-green-600 dark:text-green-400">
          Copied!
        </span>
      )}
    </div>
  );
}
