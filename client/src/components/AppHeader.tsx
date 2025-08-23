import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useTournamentContext } from '../contexts/TournamentContext';
import { headerConfig } from '../config/headerConfig';

export default function AppHeader() {
  const [location, setLocation] = useLocation();
  const { activeTournament } = useTournamentContext();

  // Find matching route config
  const routeConfig = headerConfig.find(config => {
    if (config.pattern instanceof RegExp) {
      return config.pattern.test(location);
    }
    return config.pattern === location;
  });

  const title = routeConfig?.title || 'SW Monthly Golf';
  const isRoot = location === '/';

  const handleHomeClick = () => {
    if (location.startsWith('/tournaments/')) {
      const tournamentId = location.split('/')[2];
      if (tournamentId) {
        setLocation(`/tournaments/${tournamentId}`);
        return;
      }
    }
    setLocation('/');
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(64px + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left: Home button and/or tournament context */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {!isRoot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleHomeClick}
                  className="p-2"
                  aria-label="Home"
                  data-testid="button-header-home"
                >
                  <Home className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Home</TooltipContent>
            </Tooltip>
          )}

          {activeTournament ? (
            <div className="text-left min-w-0 flex-1" data-testid="tournament-info">
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                SW Monthly Golf
              </div>
              <div className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                {activeTournament.name} • {new Date(activeTournament.date).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              SW Monthly Golf
            </h1>
          )}
        </div>

        {/* Center: Route title */}
        <div className="px-4 flex-1 text-center">
          <h2
            className="text-base font-medium text-gray-800 dark:text-gray-200 truncate"
            data-testid="header-title"
          >
            {title}
          </h2>
        </div>

        {/* Right: Empty placeholder for spacing */}
        <div className="flex items-center min-w-0 flex-1 justify-end" />
      </div>
    </header>
  );
}
