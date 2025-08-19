import React, { useState, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Minus, Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queueScoreUpdate, getPendingSyncCount, isFlushInProgress, flushScoreQueue } from '../lib/dexie';
import { deriveSyncStatus, getSyncStatusText, getSyncStatusClasses, type SyncStatus } from '../lib/sync';
import { strokesReceived, formatParRow, formatSIRow, isValidSIPermutation } from '../../../shared/handicapNet';

interface GroupScoringData {
  group: {
    id: string;
    name: string;
    teeTime: Date | null;
  };
  tournament: {
    id: string;
    name: string;
    courseId: string;
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

interface CourseHole {
  hole: number;
  par: number;
  strokeIndex: number;
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
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [showHandicapDots, setShowHandicapDots] = useState(true);
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

  // Load handicap dots preference from localStorage
  useEffect(() => {
    if (params?.tournamentId) {
      const savedPreference = localStorage.getItem(`hdcp-dots-${params.tournamentId}`);
      if (savedPreference !== null) {
        setShowHandicapDots(savedPreference === 'true');
      }
    }
  }, [params?.tournamentId]);

  // Fetch course holes when tournament data is available
  useEffect(() => {
    const fetchCourseHoles = async () => {
      if (!scoringData?.tournament?.courseId) return;
      
      try {
        const response = await fetch(`/api/courses/${scoringData.tournament.courseId}/holes`);
        if (response.ok) {
          const data = await response.json();
          if (data.holes && Array.isArray(data.holes) && data.holes.length === 18) {
            setCourseHoles(data.holes);
          }
        }
      } catch (error) {
        console.error('Error fetching course holes:', error);
        // Silently fail - holes are optional for scoring functionality
      }
    };

    fetchCourseHoles();
  }, [scoringData?.tournament?.courseId]);

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

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          
          {/* Handicap Dots Toggle */}
          <Button
            variant={showHandicapDots ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newValue = !showHandicapDots;
              setShowHandicapDots(newValue);
              if (params?.tournamentId) {
                localStorage.setItem(`hdcp-dots-${params.tournamentId}`, newValue.toString());
              }
            }}
            data-testid="button-toggle-handicap-dots"
            className="text-xs"
          >
            HDCP dots: {showHandicapDots ? 'On' : 'Off'}
          </Button>
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

      {/* 18-Hole Scoring Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Rows */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b">
                {/* Hole Numbers Row */}
                <div className="grid grid-cols-19 gap-0 text-center text-xs font-medium">
                  <div className="p-2 border-r">Player</div>
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i + 1} className="p-2 border-r">
                      {i + 1}
                    </div>
                  ))}
                </div>
                
                {/* Par Row */}
                {courseHoles.length === 18 && (
                  <div className="grid grid-cols-19 gap-0 text-center text-xs bg-gray-50 dark:bg-gray-800">
                    <div className="p-1 border-r text-gray-600 dark:text-gray-400">Par</div>
                    {formatParRow(courseHoles).map((par, i) => (
                      <div key={i} className="p-1 border-r text-gray-600 dark:text-gray-400">
                        {par}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* SI Row */}
                {courseHoles.length === 18 && isValidSIPermutation(formatSIRow(courseHoles)) && (
                  <div className="grid grid-cols-19 gap-0 text-center text-xs bg-gray-100 dark:bg-gray-700">
                    <div className="p-1 border-r text-gray-500 dark:text-gray-400">SI</div>
                    {formatSIRow(courseHoles).map((si, i) => (
                      <div key={i} className="p-1 border-r text-gray-500 dark:text-gray-400">
                        {si}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Player Rows */}
              {scoringData.entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-19 gap-0 border-b">
                  {/* Player Info */}
                  <div className="p-2 border-r flex flex-col justify-center">
                    <div className="font-medium text-sm">{entry.player.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      CH: {entry.playingCH}
                    </div>
                  </div>
                  
                  {/* Score Cells */}
                  {Array.from({ length: 18 }, (_, holeIndex) => {
                    const hole = holeIndex + 1;
                    const score = localScores[entry.id]?.[hole] || 0;
                    const strokesRcvd = courseHoles.length === 18 && showHandicapDots
                      ? strokesReceived(entry.playingCH, courseHoles[holeIndex]?.strokeIndex || 1)
                      : 0;
                    
                    const renderHandicapDots = (strokes: number) => {
                      if (strokes === 0) return null;
                      if (strokes === 1) return <span className="text-blue-500">•</span>;
                      if (strokes === 2) return <span className="text-blue-500">••</span>;
                      return <span className="text-blue-500 text-xs">•×{strokes}</span>;
                    };
                    
                    return (
                      <div 
                        key={hole}
                        className="relative border-r p-1 min-h-[60px] flex flex-col items-center justify-center"
                      >
                        {/* Handicap Dots */}
                        {showHandicapDots && strokesRcvd > 0 && (
                          <div 
                            className="absolute top-1 right-1 opacity-70"
                            aria-hidden="true"
                          >
                            {renderHandicapDots(strokesRcvd)}
                          </div>
                        )}
                        
                        {/* Score Display */}
                        <div className="text-lg font-medium mb-1">
                          {score || '--'}
                        </div>
                        
                        {/* +/- Buttons */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateScore(entry.id, hole, -1)}
                            disabled={score <= 1}
                            data-testid={`button-minus-${entry.id}-${hole}`}
                            aria-label={`Hole ${hole}, Par ${courseHoles[holeIndex]?.par || 4}, SI ${courseHoles[holeIndex]?.strokeIndex || 1}, receiving ${strokesRcvd} stroke${strokesRcvd !== 1 ? 's' : ''}, current score ${score || 'none'}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateScore(entry.id, hole, 1)}
                            data-testid={`button-plus-${entry.id}-${hole}`}
                            aria-label={`Hole ${hole}, Par ${courseHoles[holeIndex]?.par || 4}, SI ${courseHoles[holeIndex]?.strokeIndex || 1}, receiving ${strokesRcvd} stroke${strokesRcvd !== 1 ? 's' : ''}, current score ${score || 'none'}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* Totals Row */}
              <div className="grid grid-cols-19 gap-0 bg-gray-50 dark:bg-gray-800 font-medium">
                <div className="p-2 border-r">Total</div>
                {scoringData.entries.map((entry, entryIndex) => (
                  Array.from({ length: 18 }, (_, holeIndex) => {
                    if (entryIndex === 0) {
                      // Show hole totals for first player only (to avoid duplicates)
                      const holeTotal = scoringData.entries.reduce((sum, e) => {
                        return sum + (localScores[e.id]?.[holeIndex + 1] || 0);
                      }, 0);
                      return (
                        <div key={holeIndex} className="p-2 border-r text-center text-sm">
                          {holeTotal || '--'}
                        </div>
                      );
                    }
                    return null;
                  })
                )).flat().filter(Boolean)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoringData.entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">{entry.player.name}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Gross:</span>
                  <span className="font-medium">
                    {Object.values(localScores[entry.id] || {}).reduce((sum, score) => sum + score, 0) || '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Playing CH:</span>
                  <span>{entry.playingCH}</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Net:</span>
                  <span className="font-medium">
                    {Object.values(localScores[entry.id] || {}).reduce((sum, score) => sum + score, 0) 
                      ? Object.values(localScores[entry.id] || {}).reduce((sum, score) => sum + score, 0) - entry.playingCH
                      : '--'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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