import React, { useState, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Minus, Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queueScoreUpdate, getPendingSyncCount, flushScoreQueue } from '../lib/dexie';
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
          console.log('Course holes data:', data); // Debug log
          if (data.holes && Array.isArray(data.holes) && data.holes.length === 18) {
            setCourseHoles(data.holes);
            console.log('Set course holes:', data.holes); // Debug log
          } else {
            console.log('Course holes not found or invalid length:', data); // Debug log
          }
        }
      } catch (error) {
        console.error('Error fetching course holes:', error);
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
      await flushScoreQueue();
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

  // Add haptic feedback function
  const lightTap = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Very light buzz
    }
  }, []);

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
                <div className="grid grid-cols-22 gap-0 text-center text-xs font-medium">
                  <div className="p-2 border-r">Hole</div>
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i + 1} className="p-2 border-r">
                      {i + 1}
                    </div>
                  ))}
                  <div className="p-2 border-r bg-blue-50 dark:bg-blue-900/20">OUT</div>
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i + 10} className="p-2 border-r">
                      {i + 10}
                    </div>
                  ))}
                  <div className="p-2 border-r bg-green-50 dark:bg-green-900/20">IN</div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20">TOT</div>
                </div>
                

                
                {/* Handicap Row */}
                <div className="grid grid-cols-22 gap-0 text-center text-xs bg-gray-100 dark:bg-gray-700">
                  <div className="p-1 border-r text-gray-500 dark:text-gray-400">Handicap</div>
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="p-1 border-r text-gray-500 dark:text-gray-400">
                      {courseHoles[i]?.strokeIndex || (i + 1)}
                    </div>
                  ))}
                  <div className="p-1 border-r text-gray-500 dark:text-gray-400"></div>
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i + 9} className="p-1 border-r text-gray-500 dark:text-gray-400">
                      {courseHoles[i + 9]?.strokeIndex || (i + 10)}
                    </div>
                  ))}
                  <div className="p-1 border-r text-gray-500 dark:text-gray-400"></div>
                  <div className="p-1 text-gray-500 dark:text-gray-400"></div>
                </div>
              </div>
              
              {/* Player Rows */}
              {scoringData.entries.map((entry) => {
                const playerScores = localScores[entry.id] || {};
                const frontNine = Array.from({ length: 9 }, (_, i) => playerScores[i + 1] || 0).reduce((sum, score) => sum + score, 0);
                const backNine = Array.from({ length: 9 }, (_, i) => playerScores[i + 10] || 0).reduce((sum, score) => sum + score, 0);
                const totalScore = frontNine + backNine;
                
                // Calculate par totals for played holes only
                const frontNineHolesPlayed = Array.from({ length: 9 }, (_, i) => playerScores[i + 1] || 0).filter(score => score > 0).length;
                const backNineHolesPlayed = Array.from({ length: 9 }, (_, i) => playerScores[i + 10] || 0).filter(score => score > 0).length;
                
                const frontParPlayed = courseHoles.length === 18 
                  ? Array.from({ length: 9 }, (_, i) => playerScores[i + 1] > 0 ? (courseHoles[i]?.par || 4) : 0).reduce((sum, par) => sum + par, 0)
                  : frontNineHolesPlayed * 4;
                const backParPlayed = courseHoles.length === 18 
                  ? Array.from({ length: 9 }, (_, i) => playerScores[i + 10] > 0 ? (courseHoles[i + 9]?.par || 4) : 0).reduce((sum, par) => sum + par, 0)
                  : backNineHolesPlayed * 4;
                const totalParPlayed = frontParPlayed + backParPlayed;
                const totalPar = courseHoles.length === 18 ? courseHoles.reduce((sum, hole) => sum + hole.par, 0) : 72;
                
                // Calculate to-par scores for played holes only
                const frontToPar = frontNine && frontNineHolesPlayed > 0 ? frontNine - frontParPlayed : 0;
                const backToPar = backNine && backNineHolesPlayed > 0 ? backNine - backParPlayed : 0;
                const totalToPar = totalScore && (frontNineHolesPlayed + backNineHolesPlayed) > 0 ? totalScore - totalParPlayed : 0;
                
                // Calculate net scores
                const grossTotal = totalScore || 0;
                const netTotal = grossTotal ? grossTotal - entry.playingCH : 0;
                const netToPar = netTotal && (frontNineHolesPlayed + backNineHolesPlayed) > 0 ? netTotal - totalParPlayed : 0;

                return (
                  <div key={entry.id} className="grid grid-cols-22 gap-0 border-b">
                    {/* Player Info */}
                    <div className="p-2 border-r flex flex-col justify-center">
                      <div className="font-medium text-sm">{entry.player.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        CH: {entry.playingCH}
                      </div>
                    </div>
                    
                    {/* Front 9 Score Cells */}
                    {Array.from({ length: 9 }, (_, holeIndex) => {
                      const hole = holeIndex + 1;
                      const score = localScores[entry.id]?.[hole] || 0;
                      const strokesRcvd = courseHoles.length === 18 && showHandicapDots
                        ? strokesReceived(entry.playingCH, courseHoles[holeIndex]?.strokeIndex || 1)
                        : 0;
                      
                      const renderHandicapDots = (strokes: number) => {
                        if (strokes === 0) return null;
                        if (strokes === 1) return <span className="text-blue-600 font-bold text-lg">•</span>;
                        if (strokes === 2) return <span className="text-blue-600 font-bold text-lg">••</span>;
                        return <span className="text-blue-600 font-bold text-sm">•×{strokes}</span>;
                      };
                      
                      return (
                        <div 
                          key={hole}
                          className="relative border-r p-1 min-h-[80px] flex flex-col items-center justify-center"
                        >
                          {/* Handicap Dots */}
                          {strokesRcvd > 0 && (
                            <div 
                              className="absolute top-1 right-1 opacity-100 z-10"
                              aria-hidden="true"
                            >
                              {renderHandicapDots(strokesRcvd)}
                            </div>
                          )}
                          
                          {/* + Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 touch-manipulation active:scale-95 transition-all mb-1"
                            onClick={() => {
                              lightTap();
                              updateScore(entry.id, hole, 1);
                            }}
                            data-testid={`button-plus-${entry.id}-${hole}`}
                            aria-label={`Increase score for hole ${hole}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          
                          {/* Score Display */}
                          <div className="text-lg font-medium my-1 tabular-nums">
                            {score || '--'}
                          </div>
                          
                          {/* - Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 touch-manipulation active:scale-95 transition-all mt-1"
                            onClick={() => {
                              lightTap();
                              updateScore(entry.id, hole, -1);
                            }}
                            disabled={score <= 1}
                            data-testid={`button-minus-${entry.id}-${hole}`}
                            aria-label={`Decrease score for hole ${hole}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}

                    {/* Out Total */}
                    <div className="border-r p-2 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">OUT</div>
                      <div className="text-lg font-bold tabular-nums">{frontNine || '--'}</div>
                      {frontNine > 0 && (
                        <div className={`text-xs tabular-nums ${frontToPar === 0 ? 'text-gray-500' : frontToPar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {frontToPar === 0 ? 'E' : frontToPar > 0 ? `+${frontToPar}` : frontToPar}
                        </div>
                      )}
                    </div>

                    {/* Back 9 Score Cells */}
                    {Array.from({ length: 9 }, (_, holeIndex) => {
                      const hole = holeIndex + 10;
                      const score = localScores[entry.id]?.[hole] || 0;
                      const strokesRcvd = courseHoles.length === 18 && showHandicapDots
                        ? strokesReceived(entry.playingCH, courseHoles[holeIndex + 9]?.strokeIndex || 1)
                        : 0;
                      
                      const renderHandicapDots = (strokes: number) => {
                        if (strokes === 0) return null;
                        if (strokes === 1) return <span className="text-blue-600 font-bold text-lg">•</span>;
                        if (strokes === 2) return <span className="text-blue-600 font-bold text-lg">••</span>;
                        return <span className="text-blue-600 font-bold text-sm">•×{strokes}</span>;
                      };
                      
                      return (
                        <div 
                          key={hole}
                          className="relative border-r p-1 min-h-[80px] flex flex-col items-center justify-center"
                        >
                          {/* Handicap Dots */}
                          {strokesRcvd > 0 && (
                            <div 
                              className="absolute top-1 right-1 opacity-100 z-10"
                              aria-hidden="true"
                            >
                              {renderHandicapDots(strokesRcvd)}
                            </div>
                          )}
                          
                          {/* + Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 touch-manipulation active:scale-95 transition-all mb-1"
                            onClick={() => {
                              lightTap();
                              updateScore(entry.id, hole, 1);
                            }}
                            data-testid={`button-plus-${entry.id}-${hole}`}
                            aria-label={`Increase score for hole ${hole}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          
                          {/* Score Display */}
                          <div className="text-lg font-medium my-1 tabular-nums">
                            {score || '--'}
                          </div>
                          
                          {/* - Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 touch-manipulation active:scale-95 transition-all mt-1"
                            onClick={() => {
                              lightTap();
                              updateScore(entry.id, hole, -1);
                            }}
                            disabled={score <= 1}
                            data-testid={`button-minus-${entry.id}-${hole}`}
                            aria-label={`Decrease score for hole ${hole}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}

                    {/* In Total */}
                    <div className="border-r p-2 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">IN</div>
                      <div className="text-lg font-bold tabular-nums">{backNine || '--'}</div>
                      {backNine > 0 && (
                        <div className={`text-xs tabular-nums ${backToPar === 0 ? 'text-gray-500' : backToPar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {backToPar === 0 ? 'E' : backToPar > 0 ? `+${backToPar}` : backToPar}
                        </div>
                      )}
                    </div>

                    {/* Total Score */}
                    <div className="p-2 flex flex-col items-center justify-center bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">TOTAL</div>
                      <div className="text-xl font-bold tabular-nums">{totalScore || '--'}</div>
                      {totalScore > 0 && (
                        <div className={`text-sm tabular-nums ${totalToPar === 0 ? 'text-gray-500' : totalToPar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {totalToPar === 0 ? 'EVEN' : totalToPar > 0 ? `+${totalToPar}` : totalToPar}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Par Row */}
              <div className="grid grid-cols-22 gap-0 text-center text-xs bg-gray-50 dark:bg-gray-800 border-t-2">
                <div className="p-1 border-r text-gray-600 dark:text-gray-400 font-medium">Par</div>
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="p-1 border-r text-gray-600 dark:text-gray-400">
                    {courseHoles[i]?.par || 4}
                  </div>
                ))}
                <div className="p-1 border-r text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20">
                  {Array.from({ length: 9 }, (_, i) => courseHoles[i]?.par || 4).reduce((sum, par) => sum + par, 0)}
                </div>
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i + 9} className="p-1 border-r text-gray-600 dark:text-gray-400">
                    {courseHoles[i + 9]?.par || 4}
                  </div>
                ))}
                <div className="p-1 border-r text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20">
                  {Array.from({ length: 9 }, (_, i) => courseHoles[i + 9]?.par || 4).reduce((sum, par) => sum + par, 0)}
                </div>
                <div className="p-1 text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20">
                  {Array.from({ length: 18 }, (_, i) => courseHoles[i]?.par || 4).reduce((sum, par) => sum + par, 0)}
                </div>
              </div>
              
              
            </div>
          </div>
        </CardContent>
      </Card>

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