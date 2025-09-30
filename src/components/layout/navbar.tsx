'use client';

import { LoginModal } from '@/components/auth/login-modal';
import { ProfileMenu } from '@/components/auth/profile-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface NavbarProps {
  onConnect?: () => void;
}

export function Navbar({ onConnect }: NavbarProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">LightningO</h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/bounties"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Bounties
            </Link>
            <Link
              href="/gigs"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Gigs
            </Link>
            <Link
              href="/grants"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Grants
            </Link>
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
                className="hidden sm:inline-flex"
              >
                Connect Nostr
              </Button>
            )}
            <ThemeToggle />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen
            ? 'max-h-96 opacity-100 visible'
            : 'max-h-0 opacity-0 invisible'
        }`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-40">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/bounties"
                className="text-sm font-medium hover:text-primary transition-colors py-3 px-2 rounded-md hover:bg-accent/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Bounties
              </Link>
              <Link
                href="/gigs"
                className="text-sm font-medium hover:text-primary transition-colors py-3 px-2 rounded-md hover:bg-accent/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Gigs
              </Link>
              <Link
                href="/grants"
                className="text-sm font-medium hover:text-primary transition-colors py-3 px-2 rounded-md hover:bg-accent/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Grants
              </Link>

              {/* Mobile Connect Button */}
              {!user && (
                <div className="pt-2 border-t">
                  <Button
                    onClick={() => {
                      setShowLoginModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    variant="gradient"
                    size="sm"
                    className="w-full"
                    data-connect-wallet
                  >
                    Connect Nostr
                  </Button>
                </div>
              )}
            </nav>
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
