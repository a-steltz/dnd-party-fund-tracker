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

/**
 * Static metadata for the V1 app.
 */
export const metadata: Metadata = {
  title: 'D&D Party Fund Tracker',
  description: 'Local-first party fund ledger and loot split calculator (V1).',
};

/**
 * Next.js root layout wrapper for the app.
 *
 * @param children - App content.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
