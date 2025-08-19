import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  MoreHorizontal,
  Clock,
  Undo,
  Settings
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useTournamentContext } from '../contexts/TournamentContext';
import { headerConfig } from '../config/headerConfig';

export default function AppHeader() {
  const [location, setLocation] = useLocation();
  const { activeTournament, clearActiveTournament } = useTournamentContext();

  // Find matching route config
  const routeConfig = headerConfig.find(config => {
    if (config.pattern instanceof RegExp) {
      return config.pattern.test(location);
    }
    return config.pattern === location;
  });

  const title = routeConfig?.title || 'SW Monthly Golf';
  const actions = routeConfig?.actions || [];
  const isRoot = location === '/';
  
  const handleTitleClick = () => {
    if (activeTournament) {
      clearActiveTournament();
      setLocation('/tournaments');
    }
  };

  const handleBackClick = () => {
    if (location.startsWith('/tournaments/') && location.includes('/')) {
      // If in tournament detail or sub-routes, go back to tournament detail
      const tournamentId = location.split('/')[2];
      setLocation(`/tournaments/${tournamentId}`);
    } else {
      // General back navigation
      setLocation('/');
    }
  };

  const executeAction = (action: any) => {
    if (action.onClick) {
      action.onClick({ location, setLocation, activeTournament });
    }
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
        {/* Left: Back button and/or tournament context */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {!isRoot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleBackClick}
                  className="p-2"
                  aria-label="Go back"
                  data-testid="button-header-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back</TooltipContent>
            </Tooltip>
          )}
          
          {activeTournament ? (
            <button
              onClick={handleTitleClick}
              className="text-left min-w-0 flex-1"
              aria-label="Switch tournament"
              data-testid="button-tournament-switcher"
            >
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                SW Monthly Golf
              </div>
              <div className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                {activeTournament.name} • {new Date(activeTournament.date).toLocaleDateString()}
              </div>
            </button>
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

        {/* Right: Action buttons */}
        <div className="flex items-center space-x-1 min-w-0 flex-1 justify-end">
          {actions.slice(0, 2).map((action, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => executeAction(action)}
                  className="p-2"
                  aria-label={action.label}
                  data-testid={`button-header-${action.testId || action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{action.label}</TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow menu for additional actions */}
          {actions.length > 2 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2"
                  aria-label="More actions"
                  data-testid="button-header-overflow"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.slice(2).map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => executeAction(action)}
                    data-testid={`menu-item-${action.testId || action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="flex items-center gap-2">
                      {action.icon}
                      {action.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}