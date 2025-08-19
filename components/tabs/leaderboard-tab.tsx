'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type GameType = 'gross' | 'net' | 'skins';

interface LeaderboardEntry {
  position: number;
  player: string;
  handicapIndex: number;
  courseHandicap: number;
  score: number;
  toPar: string;
}

export default function LeaderboardTab() {
  const [selectedGame, setSelectedGame] = useState<GameType>('gross');

  const leaderboard: LeaderboardEntry[] = [
    {
      position: 1,
      player: 'Mike Johnson',
      handicapIndex: 8.2,
      courseHandicap: 9,
      score: 72,
      toPar: 'E'
    },
    {
      position: 2,
      player: 'John Smith',
      handicapIndex: 12.4,
      courseHandicap: 14,
      score: 75,
      toPar: '+3'
    },
    {
      position: 3,
      player: 'Sarah Wilson',
      handicapIndex: 15.7,
      courseHandicap: 18,
      score: 78,
      toPar: '+6'
    }
  ];

  const getPositionBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-green-600 text-white';
      case 2:
        return 'bg-gray-400 text-white';
      case 3:
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getScoreColor = (toPar: string) => {
    if (toPar === 'E') return 'text-green-600 dark:text-green-400';
    if (toPar.startsWith('-')) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-4 space-y-4">
      {/* Game Selection */}
      <div className="flex space-x-2">
        <Button
          variant={selectedGame === 'gross' ? 'default' : 'outline'}
          className={`flex-1 ${
            selectedGame === 'gross' 
              ? 'bg-green-600 hover:bg-green-700' 
              : ''
          }`}
          onClick={() => setSelectedGame('gross')}
          data-testid="button-game-gross"
        >
          Gross Total
        </Button>
        <Button
          variant={selectedGame === 'net' ? 'default' : 'outline'}
          className={`flex-1 ${
            selectedGame === 'net' 
              ? 'bg-green-600 hover:bg-green-700' 
              : ''
          }`}
          onClick={() => setSelectedGame('net')}
          data-testid="button-game-net"
        >
          Net Total
        </Button>
        <Button
          variant={selectedGame === 'skins' ? 'default' : 'outline'}
          className={`flex-1 ${
            selectedGame === 'skins' 
              ? 'bg-green-600 hover:bg-green-700' 
              : ''
          }`}
          onClick={() => setSelectedGame('skins')}
          data-testid="button-game-skins"
        >
          Skins
        </Button>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardContent className="p-0">
          {leaderboard.map((player, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              data-testid={`leaderboard-row-${index}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getPositionBadgeColor(player.position)}`}>
                  {player.position}
                </div>
                <div>
                  <div 
                    className="font-medium text-gray-900 dark:text-white"
                    data-testid={`text-player-name-${index}`}
                  >
                    {player.player}
                  </div>
                  <div 
                    className="text-sm text-gray-600 dark:text-gray-400"
                    data-testid={`text-handicap-${index}`}
                  >
                    HI: {player.handicapIndex} • CH: {player.courseHandicap}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div 
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                  data-testid={`text-score-${index}`}
                >
                  {player.score}
                </div>
                <div 
                  className={`text-sm ${getScoreColor(player.toPar)}`}
                  data-testid={`text-to-par-${index}`}
                >
                  {player.toPar}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Live Scoring Updates */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div 
              className="text-sm text-blue-800 dark:text-blue-200"
              data-testid="text-live-update"
            >
              <strong>Live:</strong> Mike Johnson eagles hole 15, moves to -2
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
