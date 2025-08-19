'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function ScoreTab() {
  const [currentHole, setCurrentHole] = useState(7);
  const [selectedPlayer, setSelectedPlayer] = useState('john-smith');
  const [holeScore, setHoleScore] = useState(4);
  const [scores, setScores] = useState<Record<number, number>>({
    1: 4, 2: 3, 3: 5, 4: 4, 5: 6, 6: 3, 7: 4
  });

  const players = [
    { id: 'john-smith', name: 'John Smith', handicap: 12.4 },
    { id: 'mike-johnson', name: 'Mike Johnson', handicap: 8.2 },
    { id: 'sarah-wilson', name: 'Sarah Wilson', handicap: 15.7 },
  ];

  const holes = [
    { number: 7, par: 4, yards: 385 }
  ];

  const frontNineScore = Object.keys(scores)
    .filter(hole => parseInt(hole) <= 9)
    .reduce((total, hole) => total + scores[parseInt(hole)], 0);

  const handleScoreSelect = (score: number) => {
    setHoleScore(score);
    setScores(prev => ({ ...prev, [currentHole]: score }));
  };

  const navigateHole = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentHole > 1) {
      setCurrentHole(currentHole - 1);
    } else if (direction === 'next' && currentHole < 18) {
      setCurrentHole(currentHole + 1);
    }
    setHoleScore(scores[currentHole] || 0);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Player Selection */}
      <Card>
        <CardContent className="pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scoring For
          </label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger data-testid="select-player">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {players.map(player => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name} (HI: {player.handicap})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Hole Selection */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 
              className="text-lg font-semibold text-gray-900 dark:text-white"
              data-testid="text-current-hole"
            >
              Hole {currentHole}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Par 4 • 385 yds
            </div>
          </div>
          
          {/* Hole Navigation */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigateHole('prev')}
              disabled={currentHole === 1}
              data-testid="button-prev-hole"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Hole {currentHole - 1}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => navigateHole('next')}
              disabled={currentHole === 18}
              data-testid="button-next-hole"
            >
              Hole {currentHole + 1}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Score Input */}
          <div className="grid grid-cols-6 gap-2">
            {SCORE_OPTIONS.slice(0, 6).map(score => (
              <Button
                key={score}
                variant={holeScore === score ? "default" : "outline"}
                className={`aspect-square text-lg font-semibold ${
                  holeScore === score 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
                onClick={() => handleScoreSelect(score)}
                data-testid={`button-score-${score}`}
              >
                {score === 6 ? '6+' : score}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scorecard Summary */}
      <Card>
        <CardContent className="pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Scorecard
          </h4>
          <div className="grid grid-cols-9 gap-1 text-xs">
            {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
              <div key={hole} className="text-center">
                <div className="font-medium text-gray-600 dark:text-gray-400">
                  {hole}
                </div>
                <div 
                  className={`font-mono ${
                    hole === currentHole 
                      ? 'text-blue-600 dark:text-blue-400 font-bold' 
                      : scores[hole] 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400'
                  }`}
                  data-testid={`score-hole-${hole}`}
                >
                  {scores[hole] || '-'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Front 9:</span>
            <span 
              className="font-mono font-medium"
              data-testid="text-front-nine-score"
            >
              {frontNineScore || '-'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
