'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import PasscodeEntry from '@/components/passcode-entry';
import MobileLayout from '@/components/mobile-layout';

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);

  const handlePasscodeSubmit = (code: string, organizer: boolean) => {
    setPasscode(code);
    setIsOrganizer(organizer);
    setIsAuthenticated(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {!isAuthenticated ? (
            <PasscodeEntry onSubmit={handlePasscodeSubmit} />
          ) : (
            <MobileLayout 
              passcode={passcode} 
              isOrganizer={isOrganizer}
            />
          )}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
