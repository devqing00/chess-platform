import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ShellProvider } from '@/context/ShellContext';
import { AppShell } from '@/components/layout/AppShell';
import { AuthModal } from '@/components/auth/AuthModal';
import { TactileFeedbackProvider } from '@/components/ui/TactileFeedbackProvider';

const fontSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#161512',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Check.mate - Play Chess Online - Free Games & Grandmaster Training',
  description: 'The premier Check.mate chess platform featuring Stockfish evaluation, AI Coach explanations, 20+ grandmaster bots, tactical puzzles, opening explorer, and game review.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Check.mate',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Check.mate - Play Chess Online',
    description: 'Stockfish evaluation, AI Coach explanations, 20+ grandmaster bots, and game review.',
    images: [{ url: '/brand/logo-colored.png', width: 1024, height: 1024, alt: 'Check.mate Logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Check.mate - Play Chess Online',
    description: 'Stockfish evaluation, AI Coach explanations, 20+ grandmaster bots, and game review.',
    images: ['/brand/logo-colored.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#161512] text-zinc-100 font-sans">
        <AuthProvider>
          <ShellProvider>
            <TactileFeedbackProvider>
              <AppShell>
                {children}
              </AppShell>
              <AuthModal />
            </TactileFeedbackProvider>
          </ShellProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
