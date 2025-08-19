'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

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

export default function ClientLayout({ children }: React.PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {children}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}