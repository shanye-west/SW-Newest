import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, type ScoreQueueItem } from '../lib/dexie';

interface GroupScoringData {
  group: {
    id: string;
    name: string;
    teeTime: Date | null;
  };
  tournament: {
    id: string;
    name: string;
    course: {
      name: string;
      par: number;
    };
  };
  entries: Array<{
    id: string;
    player: {
      id: string;
      name: string;
    };
    courseHandicap: number;
    playingCH: number;
    holeScores: { [hole: number]: number };
  }>;
}

export default function GroupScoring() {
  const [match, params] = useRoute('/tournaments/:tournamentId/score/:groupId');
  const [scoringData, setScoringData] = useState<GroupScoringData | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [localScores, setLocalScores] = useState<{ [entryId: string]: { [hole: number]: number } }>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (params?.tournamentId && params?.groupId) {
      fetchGroupScoringData(params.tournamentId, params.groupId);
      loadLocalScores();
      checkPendingSyncCount();
    }
  }, [params?.tournamentId, params?.groupId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingScores();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchGroupScoringData = async (tournamentId: string, groupId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/scores/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setScoringData(data);
        
        // Initialize local scores from server data
        const serverScores: { [entryId: string]: { [hole: number]: number } } = {};
        data.entries.forEach((entry: any) => {
          serverScores[entry.id] = { ...entry.holeScores };
        });
        setLocalScores(serverScores);
      } else {
        toast({
          title: "Error",
          description: "Failed to load scoring data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching group scoring data:', error);
      toast({
        title: "Error",
        description: "Failed to load scoring data",
        variant: "destructive"
      });
    }
  };

  const loadLocalScores = async () => {
    try {
      const syncedScores = await db.syncedScores.toArray();
      const localScoreMap: { [entryId: string]: { [hole: number]: number } } = {};
      
      syncedScores.forEach(score => {
        if (!localScoreMap[score.entryId]) {
          localScoreMap[score.entryId] = {};
        }
        localScoreMap[score.entryId][score.hole] = score.strokes;
      });
      
      setLocalScores(prev => ({ ...prev, ...localScoreMap }));
    } catch (error) {
      console.error('Error loading local scores:', error);
    }
  };

  const checkPendingSyncCount = async () => {
    try {
      const count = await db.scoreQueue.where('synced').equals(false).count();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Error checking pending sync count:', error);
    }
  };

  const updateScore = async (entryId: string, hole: number, strokes: number) => {
    if (strokes < 1 || strokes > 15) return;

    // Update local state immediately
    setLocalScores(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [hole]: strokes
      }
    }));

    const now = new Date();

    try {
      // Store in offline queue
      await db.scoreQueue.add({
        entryId,
        hole,
        strokes,
        timestamp: now,
        synced: false
      });

      checkPendingSyncCount();

      // Try to sync immediately if online
      if (isOnline) {
        await syncScore(entryId, hole, strokes, now);
      } else {
        toast({
          title: "Offline",
          description: "Score saved locally. Will sync when online.",
        });
      }
    } catch (error) {
      console.error('Error saving score:', error);
      toast({
        title: "Error",
        description: "Failed to save score",
        variant: "destructive"
      });
    }
  };

  const syncScore = async (entryId: string, hole: number, strokes: number, updatedAt: Date) => {
    try {
      const response = await fetch('/api/hole-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, hole, strokes, updatedAt })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Update synced scores
        await db.syncedScores.put({
          entryId,
          hole,
          strokes: result.strokes,
          updatedAt: new Date(result.updatedAt),
          serverUpdatedAt: new Date(result.updatedAt)
        });

        // Mark as synced in queue
        await db.scoreQueue.where({ entryId, hole }).modify({ synced: true });

        // Check if server overwrote our score
        if (result.wasOverwritten) {
          setLocalScores(prev => ({
            ...prev,
            [entryId]: {
              ...prev[entryId],
              [hole]: result.strokes
            }
          }));
          
          toast({
            title: "Score Updated",
            description: `Server had newer score for hole ${hole}`,
          });
        }

        checkPendingSyncCount();
      }
    } catch (error) {
      console.error('Error syncing score:', error);
    }
  };

  const syncPendingScores = async () => {
    try {
      const pendingScores = await db.scoreQueue.where('synced').equals(false).toArray();
      
      for (const score of pendingScores) {
        await syncScore(score.entryId, score.hole, score.strokes, score.timestamp);
      }
      
      toast({
        title: "Synced",
        description: `${pendingScores.length} scores synced with server`,
      });
    } catch (error) {
      console.error('Error syncing pending scores:', error);
    }
  };

  const getScore = (entryId: string, hole: number): number => {
    return localScores[entryId]?.[hole] || 0;
  };

  const nextHole = () => {
    if (currentHole < 18) setCurrentHole(currentHole + 1);
  };

  const prevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  if (!match || !scoringData) {
    return (
      <div className="p-4">
        <div className="text-center">Loading scoring...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            {isOnline ? 'Online' : 'Offline'}
            {pendingSyncCount > 0 && ` (${pendingSyncCount} pending)`}
          </span>
        </div>
        {pendingSyncCount > 0 && isOnline && (
          <Button size="sm" onClick={syncPendingScores} data-testid="button-sync-scores">
            Sync Now
          </Button>
        )}
      </div>

      {/* Group Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h1>{scoringData.group.name}</h1>
              <p className="text-sm text-gray-600">
                {scoringData.tournament.name} • {scoringData.tournament.course.name}
              </p>
            </div>
            {scoringData.group.teeTime && (
              <div className="text-right text-sm">
                <p>Tee Time</p>
                <p className="font-medium">
                  {new Date(scoringData.group.teeTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Hole Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={prevHole} 
              disabled={currentHole === 1}
              variant="outline"
              data-testid="button-prev-hole"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">Hole {currentHole}</h2>
              <p className="text-sm text-gray-600">Par 4</p> {/* Simplified - assume par 4 */}
            </div>
            
            <Button 
              onClick={nextHole} 
              disabled={currentHole === 18}
              variant="outline"
              data-testid="button-next-hole"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Player Scores */}
      <div className="space-y-3">
        {scoringData.entries.map(entry => {
          const score = getScore(entry.id, currentHole);
          
          return (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{entry.player.name}</h3>
                    <p className="text-sm text-gray-600">
                      CH: {entry.courseHandicap} • Playing: {entry.playingCH}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => score > 1 && updateScore(entry.id, currentHole, score - 1)}
                      disabled={score <= 1}
                      data-testid={`button-minus-${entry.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={score || ''}
                      onChange={(e) => {
                        const newScore = parseInt(e.target.value) || 0;
                        if (newScore >= 1 && newScore <= 15) {
                          updateScore(entry.id, currentHole, newScore);
                        }
                      }}
                      className="w-16 text-center"
                      data-testid={`input-score-${entry.id}`}
                    />
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateScore(entry.id, currentHole, score + 1)}
                      disabled={score >= 15}
                      data-testid={`button-plus-${entry.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hole Quick Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-9 gap-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
              <Button
                key={hole}
                size="sm"
                variant={hole === currentHole ? "default" : "outline"}
                onClick={() => setCurrentHole(hole)}
                className="aspect-square"
                data-testid={`button-hole-${hole}`}
              >
                {hole}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}