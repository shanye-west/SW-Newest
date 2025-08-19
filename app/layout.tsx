'use client';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '../client/src/components/ui/toaster';
import { TooltipProvider } from '../client/src/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export default function RootLayout({
  children,
}: React.PropsWithChildren) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="min-h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              {children}
            </div>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
