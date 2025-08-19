import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '../client/src/components/client-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SW Monthly Golf',
  description: 'Mobile-first golf tournament management PWA',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['golf', 'tournament', 'scoring', 'handicap', 'PWA'],
  authors: [{ name: 'SW Monthly Golf' }],
  icons: [
    { rel: 'apple-touch-icon', url: '/icons/icon-192x192.png' },
    { rel: 'icon', url: '/icons/icon-192x192.png' },
  ],
};

export const viewport: Viewport = {
  minimumScale: 1,
  initialScale: 1,
  width: 'device-width',
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16a34a' },
    { media: '(prefers-color-scheme: dark)', color: '#16a34a' },
  ],
};

export default function RootLayout({
  children,
}: React.PropsWithChildren) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
