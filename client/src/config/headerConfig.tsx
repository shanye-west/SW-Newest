import React from 'react';
import { 
  Plus, 
  Users, 
  Clock,
  Undo,
  Settings
} from 'lucide-react';

export interface HeaderAction {
  label: string;
  icon: React.ReactNode;
  testId?: string;
  onClick: (context: {
    location: string;
    setLocation: (path: string) => void;
    activeTournament: { id: string; name: string; date: string } | null;
  }) => void;
}

export interface HeaderConfig {
  pattern: string | RegExp;
  title: string;
  actions: HeaderAction[];
}

export const headerConfig: HeaderConfig[] = [
  {
    pattern: '/',
    title: 'Dashboard',
    actions: []
  },
  {
    pattern: '/players',
    title: 'Players',
    actions: [
      {
        label: 'Add Player',
        icon: <Plus className="w-5 h-5" />,
        testId: 'add-player',
        onClick: () => {
          // This will be handled by the players page directly
          const button = document.querySelector('[data-testid="button-add-player"]') as HTMLButtonElement;
          button?.click();
        }
      }
    ]
  },
  {
    pattern: '/courses',
    title: 'Courses',
    actions: [
      {
        label: 'Add Course',
        icon: <Plus className="w-5 h-5" />,
        testId: 'add-course',
        onClick: () => {
          // This will be handled by the courses page directly
          const button = document.querySelector('[data-testid="button-add-course"]') as HTMLButtonElement;
          button?.click();
        }
      }
    ]
  },
  {
    pattern: '/tournaments',
    title: 'Tournaments',
    actions: [
      {
        label: 'Add Tournament',
        icon: <Plus className="w-5 h-5" />,
        testId: 'add-tournament',
        onClick: () => {
          // This will be handled by the tournaments page directly
          const button = document.querySelector('[data-testid="button-add-tournament"]') as HTMLButtonElement;
          button?.click();
        }
      }
    ]
  },
  {
    pattern: /^\/tournaments\/[^/]+$/,
    title: 'Tournament',
    actions: [
      {
        label: 'Add Player to Event',
        icon: <Users className="w-5 h-5" />,
        testId: 'add-entry',
        onClick: () => {
          // This will be handled by the tournament detail page directly
          const button = document.querySelector('[data-testid="button-add-entry"]') as HTMLButtonElement;
          button?.click();
        }
      }
    ]
  },
  {
    pattern: /^\/tournaments\/[^/]+\/groups$/,
    title: 'Groups',
    actions: [
      {
        label: 'New Group',
        icon: <Plus className="w-5 h-5" />,
        testId: 'add-group',
        onClick: () => {
          // This will be handled by the tournament detail page directly
          const button = document.querySelector('[data-testid="button-add-group"]') as HTMLButtonElement;
          button?.click();
        }
      },
      {
        label: 'Edit Tee Times',
        icon: <Clock className="w-5 h-5" />,
        testId: 'edit-tee-times',
        onClick: ({ setLocation, activeTournament }) => {
          // Navigate to groups tab and trigger tee time editing
          if (activeTournament) {
            setLocation(`/tournaments/${activeTournament.id}#groups`);
          }
        }
      }
    ]
  },
  {
    pattern: /^\/tournaments\/[^/]+\/score$/,
    title: 'Score',
    actions: [
      {
        label: 'Undo',
        icon: <Undo className="w-5 h-5" />,
        testId: 'score-undo',
        onClick: () => {
          // TODO: Implement undo functionality for scoring
          console.log('Undo scoring action');
        }
      },
      {
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        testId: 'score-settings',
        onClick: () => {
          // TODO: Implement scoring settings
          console.log('Scoring settings');
        }
      }
    ]
  },
  {
    pattern: /^\/tournaments\/[^/]+\/leaderboards$/,
    title: 'Leaderboards',
    actions: []
  },
  {
    pattern: '/admin/conflicts',
    title: 'Conflicts Review',
    actions: []
  }
];

/**
 * Add a new route header configuration
 * 
 * Example:
 * addHeaderConfig({
 *   pattern: '/my-route',
 *   title: 'My Page',
 *   actions: [{
 *     label: 'My Action',
 *     icon: <MyIcon />,
 *     onClick: ({ location, setLocation }) => {
 *       // Handle action
 *     }
 *   }]
 * });
 */
export function addHeaderConfig(config: HeaderConfig) {
  headerConfig.push(config);
}

/**
 * Update an existing route header configuration
 */
export function updateHeaderConfig(pattern: string | RegExp, updates: Partial<HeaderConfig>) {
  const index = headerConfig.findIndex(config => {
    if (typeof pattern === 'string' && typeof config.pattern === 'string') {
      return config.pattern === pattern;
    }
    return config.pattern === pattern;
  });
  
  if (index !== -1) {
    headerConfig[index] = { ...headerConfig[index], ...updates };
  }
}