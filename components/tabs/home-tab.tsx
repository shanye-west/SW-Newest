'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, BarChart3, AlertTriangle } from 'lucide-react';
import { useTournament } from '@/hooks/use-tournament';

interface HomeTabProps {
  isOrganizer: boolean;
}

export default function HomeTab({ isOrganizer }: HomeTabProps) {
  const { tournament, recentActivity, offlineQueue } = useTournament();
  const [offlineQueueVisible] = useState(false); // Will be controlled by actual offline status

  return (
    <div className="p-4 space-y-6">
      {/* Tournament Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 
                className="text-lg font-semibold text-gray-900 dark:text-white"
                data-testid="text-tournament-name"
              >
                {tournament?.name || 'March Monthly Classic'}
              </h2>
              <p 
                className="text-sm text-gray-600 dark:text-gray-400"
                data-testid="text-course-name"
              >
                {tournament?.course || 'Riverside Golf Club'}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Active
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span 
                className="ml-2 font-medium"
                data-testid="text-tournament-date"
              >
                {tournament?.date || 'Mar 15, 2024'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Players:</span>
              <span 
                className="ml-2 font-medium"
                data-testid="text-player-count"
              >
                {tournament?.playerCount || '24'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Format:</span>
              <span className="ml-2 font-medium">18 Holes</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Games:</span>
              <span className="ml-2 font-medium">Gross, Net, Skins</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex-col space-y-2"
          data-testid="button-quick-score"
        >
          <Edit className="w-6 h-6" />
          <span className="text-sm font-medium">Quick Score</span>
        </Button>
        <Button 
          variant="outline"
          className="p-4 h-auto flex-col space-y-2"
          data-testid="button-leaderboard"
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-sm font-medium">Leaderboard</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={index}
                  className="flex items-center space-x-3"
                  data-testid={`activity-${index}`}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{activity.player}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {activity.action}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Queue Status */}
      {offlineQueueVisible && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Offline Scores Pending
                </h3>
                <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  <span data-testid="text-offline-count">
                    {offlineQueue.count}
                  </span> scores will sync when online
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
