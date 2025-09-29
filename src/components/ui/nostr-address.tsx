'use client';

import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface NostrAddressProps {
  pubkey: string;
  link?: boolean;
  copy?: boolean;
  className?: string;
  showFull?: boolean;
}

export function NostrAddress({
  pubkey,
  link = false,
  copy = true,
  className = '',
  showFull = false,
}: NostrAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy pubkey:', err);
    }
  };

  const handleLinkClick = () => {
    // Link to Nostr Band profile
    const profileUrl = `https://nostr.band/${pubkey}`;
    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  const displayPubkey = showFull
    ? pubkey
    : `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm text-muted-foreground">
        {displayPubkey}
      </span>

      {copy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}

      {link && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLinkClick}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
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
