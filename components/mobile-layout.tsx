'use client';

import { useState } from 'react';
import { Home, Users, MapPin, Trophy, UserCheck, Edit, BarChart3, Settings, Wifi, WifiOff } from 'lucide-react';
import HomeTab from './tabs/home-tab';
import ScoreTab from './tabs/score-tab';
import LeaderboardTab from './tabs/leaderboard-tab';

interface MobileLayoutProps {
  passcode: string;
  isOrganizer: boolean;
}

type TabType = 'home' | 'players' | 'courses' | 'tournaments' | 'groups' | 'score' | 'leaderboard';

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'courses', label: 'Courses', icon: MapPin },
  { id: 'tournaments', label: 'Events', icon: Trophy },
  { id: 'groups', label: 'Groups', icon: UserCheck },
  { id: 'score', label: 'Score', icon: Edit },
  { id: 'leaderboard', label: 'Results', icon: BarChart3 },
] as const;

export default function MobileLayout({ passcode, isOrganizer }: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOnline, setIsOnline] = useState(true);

  const getPageTitle = (tab: TabType): string => {
    const titleMap = {
      home: 'Home',
      players: 'Players',
      courses: 'Courses',
      tournaments: 'Tournaments',
      groups: 'Groups',
      score: 'Score Card',
      leaderboard: 'Leaderboard'
    };
    return titleMap[tab];
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab isOrganizer={isOrganizer} />;
      case 'score':
        return <ScoreTab />;
      case 'leaderboard':
        return <LeaderboardTab />;
      default:
        return <HomeTab isOrganizer={isOrganizer} />;
    }
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm pt-safe">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-xl font-semibold text-gray-900 dark:text-white"
              data-testid="page-title"
            >
              {getPageTitle(activeTab)}
            </h1>
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center" data-testid="connection-status">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {/* Settings Menu */}
              <button 
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                data-testid="button-settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="content-with-nav">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe"
        data-testid="bottom-navigation"
      >
        <div className="grid grid-cols-7 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                className="flex flex-col items-center justify-center space-y-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setActiveTab(tab.id as TabType)}
                data-testid={`tab-${tab.id}`}
              >
                <Icon 
                  className={`w-5 h-5 ${
                    isActive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} 
                />
                <span 
                  className={`${
                    isActive 
                      ? 'text-green-600 dark:text-green-400 font-medium' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
