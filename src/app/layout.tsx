import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ShellProvider } from '@/context/ShellContext';
import { AppShell } from '@/components/layout/AppShell';
import { AuthModal } from '@/components/auth/AuthModal';

const fontSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Check.mate - Play Chess Online - Free Games & Grandmaster Training',
  description: 'The premier Check.mate chess platform featuring Stockfish evaluation, AI Coach explanations, 20+ grandmaster bots, tactical puzzles, opening explorer, and game review.',
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
            <AppShell>
              {children}
            </AppShell>
            <AuthModal />
          </ShellProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
