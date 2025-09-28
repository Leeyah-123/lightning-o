'use client';

import { LoginModal } from '@/components/auth/LoginModal';
import { ProfileMenu } from '@/components/auth/ProfileMenu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { Zap } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onConnect?: () => void;
}

export function Header({ onConnect }: HeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-300 to-blue-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-blue-600 bg-clip-text text-transparent">
                  Lightning
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  Bounties & Gigs
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="/bounties"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Bounties
            </a>
            <a
              href="/gigs"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Gigs
            </a>
            <a
              href="/grants"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Grants
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <ProfileMenu onLogout={logout} />
            ) : (
              <Button
                onClick={() => setShowLoginModal(true)}
                variant="gradient"
                size="sm"
                data-connect-wallet
              >
                Connect Nostr
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
          onConnect?.();
        }}
      />
    </header>
  );
}
