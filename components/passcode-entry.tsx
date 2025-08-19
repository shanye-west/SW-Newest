'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PasscodeEntryProps {
  onSubmit: (passcode: string, isOrganizer: boolean) => void;
}

export default function PasscodeEntry({ onSubmit }: PasscodeEntryProps) {
  const [passcode, setPasscode] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passcode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a tournament passcode',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate passcode validation
    setTimeout(() => {
      setIsLoading(false);
      onSubmit(passcode, isOrganizer);
    }, 500);
  };

  return (
    <div className="min-h-full flex flex-col justify-center px-4 pt-safe pb-safe">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 18.5c5.25 0 9.5-1.34 9.5-3s-4.25-3-9.5-3-9.5 1.34-9.5 3 4.25 3 9.5 3z"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 12v6.5"
              />
            </svg>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            SW Monthly Golf
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter tournament passcode to join
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label 
                  htmlFor="passcode" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Tournament Passcode
                </Label>
                <Input
                  id="passcode"
                  name="passcode"
                  type="text"
                  required
                  placeholder="Enter 6-digit passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="text-center text-lg font-mono tracking-widest"
                  data-testid="input-passcode"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500"
                disabled={isLoading}
                data-testid="button-join"
              >
                {isLoading ? 'Joining...' : 'Join Tournament'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-600 dark:text-gray-400">
                  Organizer mode
                </Label>
                <Switch
                  checked={isOrganizer}
                  onCheckedChange={setIsOrganizer}
                  data-testid="switch-organizer"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Development setting for admin features
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
