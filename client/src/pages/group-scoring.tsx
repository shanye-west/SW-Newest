import React, { useState, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Minus, Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queueScoreUpdate, getPendingSyncCount, isFlushInProgress, flushScoreQueue } from '../lib/dexie';
import { deriveSyncStatus, getSyncStatusText, getSyncStatusClasses, type SyncStatus } from '../lib/sync';

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
  const [isFlushing, setIsFlushing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const { toast } = useToast();

  // Update sync status whenever relevant state changes
  useEffect(() => {
    const newSyncStatus = deriveSyncStatus({
      online: isOnline,
      queueLength: pendingSyncCount,
      isFlushing
    });
    setSyncStatus(newSyncStatus);
  }, [isOnline, pendingSyncCount, isFlushing]);

  // Refetch scores from server (used when conflicts detected)
  const refetchScores = useCallback(async () => {
    if (!params?.tournamentId || !params?.groupId) return;
    
    try {
      const response = await fetch(`/api/groups/${params.groupId}/scores`);
      if (response.ok) {
        const data = await response.json();
        setLocalScores(data.scores || {});
        console.log('Scores refetched due to conflicts');
        toast({
          title: "Scores updated",
          description: "Some changes were overwritten by more recent updates from other devices",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error refetching scores:', error);
    }
  }, [params?.tournamentId, params?.groupId, toast]);

  // Update pending sync count
  const updatePendingSyncCount = async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Error checking pending sync count:', error);
    }
  };

  // Queue flush with refetch callback
  const doFlushQueue = useCallback(async () => {
    if (!isOnline) return;
    
    setIsFlushing(true);
    try {
      await flushScoreQueue(refetchScores);
    } finally {
      setIsFlushing(false);
      // Update pending count after flush
      const newCount = await getPendingSyncCount();
      setPendingSyncCount(newCount);
    }
  }, [isOnline, refetchScores]);

  // Fetch group scoring data and existing scores
  const fetchGroupScoringData = async (tournamentId: string, groupId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/scores/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setScoringData(data);
        // Initialize local scores with server data
        if (data.entries) {
          const scores: { [entryId: string]: { [hole: number]: number } } = {};
          data.entries.forEach((entry: any) => {
            scores[entry.id] = entry.holeScores || {};
          });
          setLocalScores(scores);
        }
      }
    } catch (error) {
      console.error('Error fetching group scoring data:', error);
      toast({
        title: "Error",
        description: "Failed to load group scoring data",
        variant: "destructive"
      });
    }
  };

  // Optimistic score update with offline queue
  const updateScore = async (entryId: string, hole: number, change: number) => {
    const currentScore = localScores[entryId]?.[hole] || 0;
    const newScore = Math.max(1, currentScore + change);

    // Optimistic UI update (immediate)
    setLocalScores(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [hole]: newScore
      }
    }));

    // Queue for sync
    try {
      await queueScoreUpdate({ entryId, hole, strokes: newScore });
      console.log(`Queued score update: entry ${entryId}, hole ${hole}, strokes ${newScore}`);
      
      // Update pending count
      await updatePendingSyncCount();
      
      // Trigger sync if online
      if (isOnline) {
        doFlushQueue();
      }
    } catch (error) {
      console.error('Error queuing score:', error);
      toast({
        title: "Error",
        description: "Failed to save score change",
        variant: "destructive"
      });
      
      // Revert optimistic update on error
      setLocalScores(prev => ({
        ...prev,
        [entryId]: {
          ...prev[entryId],
          [hole]: currentScore
        }
      }));
    }
  };

  // Initial data loading
  useEffect(() => {
    if (params?.tournamentId && params?.groupId) {
      fetchGroupScoringData(params.tournamentId, params.groupId);
      updatePendingSyncCount();
      
      // Initial flush on mount
      doFlushQueue();
    }
  }, [params?.tournamentId, params?.groupId, doFlushQueue]);

  // Network event handlers
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      doFlushQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [doFlushQueue]);

  // Periodic sync every 10 seconds when there are pending items
  useEffect(() => {
    if (pendingSyncCount > 0 && isOnline) {
      const interval = setInterval(doFlushQueue, 10000);
      return () => clearInterval(interval);
    }
  }, [pendingSyncCount, isOnline, doFlushQueue]);

  if (!match) return null;

  if (!scoringData) {
    return (
      <div className="p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading scoring data...</p>
        </div>
      </div>
    );
  }

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <Check className="w-3 h-3" />;
      case 'syncing':
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'offline':
        return <WifiOff className="w-3 h-3" />;
      default:
        return <Wifi className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Header with Sync Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{scoringData.group.name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {scoringData.tournament.name} • {scoringData.tournament.course.name}
              </p>
              {scoringData.group.teeTime && (
                <p className="text-xs text-gray-500">
                  Tee Time: {new Date(scoringData.group.teeTime).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
            </div>
            
            {/* Sync Status Chip */}
            <div className={getSyncStatusClasses(syncStatus)} data-testid="sync-status">
              <div className="flex items-center gap-1">
                {getSyncStatusIcon()}
                <span>{getSyncStatusText(syncStatus)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hole Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
          disabled={currentHole <= 1}
          data-testid="button-prev-hole"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold">Hole {currentHole}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Par 4</p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          disabled={currentHole >= 18}
          data-testid="button-next-hole"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Scoring Grid */}
      <div className="space-y-4">
        {scoringData.entries.map((entry) => {
          const currentScore = localScores[entry.id]?.[currentHole] || 0;
          
          return (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{entry.player.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CH: {entry.courseHandicap} • Playing: {entry.playingCH}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(entry.id, currentHole, -1)}
                      disabled={currentScore <= 1}
                      data-testid={`button-minus-${entry.id}-${currentHole}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <div className="text-center min-w-[3rem]">
                      <div className="text-2xl font-bold" data-testid={`score-${entry.id}-${currentHole}`}>
                        {currentScore || '--'}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(entry.id, currentHole, 1)}
                      data-testid={`button-plus-${entry.id}-${currentHole}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Show total gross score */}
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Total Gross:</span>
                    <span>
                      {Object.values(localScores[entry.id] || {}).reduce((sum, score) => sum + score, 0) || '--'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Debug Info (only in dev) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Debug Info</h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Online: {isOnline ? 'Yes' : 'No'}</p>
              <p>Pending Queue: {pendingSyncCount} items</p>
              <p>Flushing: {isFlushing ? 'Yes' : 'No'}</p>
              <p>Sync Status: {syncStatus}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}