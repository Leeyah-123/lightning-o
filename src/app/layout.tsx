import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lightning - Decentralized Earning Opportunities',
  description:
    'Create, fund, and complete earning opportunities on the decentralized web. Built on Nostr and Lightning for instant, global payments.',
  keywords: [
    'bounties',
    'lightning',
    'nostr',
    'decentralized',
    'crypto',
    'bitcoin',
  ],
  authors: [{ name: 'Lightning Team' }],
  openGraph: {
    title: 'Lightning - Decentralized Earning Opportunities',
    description:
      'Create, fund, and complete bounties on the decentralized web. Built on Nostr and Lightning for instant, global payments.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
