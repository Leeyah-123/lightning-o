'use client';

import { Button } from '@/components/ui/button';
import { truncateMiddle } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import {
  Check,
  Copy,
  Download,
  Key,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProfileMenuProps {
  onLogout: () => void;
}

export function ProfileMenu({ onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, exportKeys, exportSecretKey, exportPublicKey } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyPubkey = async () => {
    if (user?.pubkey) {
      await navigator.clipboard.writeText(user.pubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportKeys = async () => {
    try {
      setExporting(true);
      exportKeys();
    } catch {
      // Export failed, but we can still show the menu
    } finally {
      setExporting(false);
    }
  };

  const handleExportSecretKey = async () => {
    try {
      setExporting(true);
      exportSecretKey();
    } catch {
      // Export failed, but we can still show the menu
    } finally {
      setExporting(false);
    }
  };

  const handleExportPublicKey = async () => {
    try {
      setExporting(true);
      exportPublicKey();
    } catch {
      // Export failed, but we can still show the menu
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 h-auto"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          {user.profile?.picture ? (
            <img
              src={user.profile.picture}
              alt={user.profile.name || 'Profile'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium">
            {user.profile?.display_name || user.profile?.name || 'Anonymous'}
          </div>
          <div className="text-xs text-muted-foreground">
            {truncateMiddle(user.pubkey, 6, 4)}
          </div>
        </div>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-background border rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                {user.profile?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profile.picture}
                    alt={user.profile.name || 'Profile'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {user.profile?.display_name ||
                    user.profile?.name ||
                    'Anonymous'}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {user.profile?.nip05 || truncateMiddle(user.pubkey, 8, 8)}
                </div>
              </div>
            </div>
            {user.profile?.about && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {user.profile.about}
              </p>
            )}
          </div>

          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPubkey}
              className="w-full justify-start"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? 'Copied!' : 'Copy Public Key'}
            </Button>

            {/* Export Keys Section */}
            <div className="border-t my-2 pt-2">
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium">
                Export Keys
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportKeys}
                disabled={exporting}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export All Keys'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportSecretKey}
                disabled={exporting}
                className="w-full justify-start"
              >
                <Key className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Secret Key'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPublicKey}
                disabled={exporting}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Public Key'}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
