import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Coins, RefreshCw, Calendar, MapPin, Monitor } from 'lucide-react';

interface LeaderboardEntry {
  entryId: string;
  playerName: string;
  courseHandicap: number;
  playingCH: number;
  grossTotal: number;
  netTotal: number;
  toPar: number;
  netToPar: number;
  position: number;
  tied: boolean;
  holeScores: { [hole: number]: number };
}

interface SkinsResult {
  hole: number;
  winnerEntryId?: string;
  winnerName?: string;
  push?: { count: number; score: number };
}

interface SkinsLeaderboard {
  playerName: string;
  entryId: string;
  skins: number;
  payout: number;
}

interface PublicResults {
  tournament: {
    id: string;
    name: string;
    date: string;
    course: {
      name: string;
      par: number;
    };
  };
  gross: LeaderboardEntry[];
  net: LeaderboardEntry[];
  skins: {
    perHole: SkinsResult[];
    perPlayer: { [entryId: string]: { playerName: string; count: number; holes: number[]; } };
    payout?: {
      potAmount: number;
      participantsForSkins: number;
      totalSkins: number;
      payoutPerSkin: number;
      perPlayerPayouts: { [entryId: string]: number };
    };
  };
  coursePar: number;
  updated: string;
}

export default function PublicResults() {
  const [match, params] = useRoute('/public/:token');
  const [location, setLocation] = useLocation();
  const [results, setResults] = useState<PublicResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for kiosk mode query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('kiosk') === '1' && params?.token) {
      setLocation(`/public/${params.token}/kiosk`);
    }
  }, [params?.token, setLocation]);

  const fetchResults = async (token: string, showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      
      const response = await fetch(`/api/public/${token}/results`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tournament not found or link may have expired');
        }
        throw new Error(`Failed to load results: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
      setLastUpdated(new Date(data.updated));
      setError(null);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (params?.token) {
      fetchResults(params.token);
      
      // Set up polling every 10 seconds for live updates
      const interval = setInterval(() => {
        fetchResults(params.token, true);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [params?.token]);

  const formatScore = (score: number, par: number): string => {
    const toPar = score - par;
    if (toPar === 0) return 'E';
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const getPositionDisplay = (entry: LeaderboardEntry): string => {
    return entry.tied ? `T-${entry.position}` : `${entry.position}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (!match) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading tournament results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Trophy className="w-12 h-12 mx-auto opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Unable to Load Results</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button 
              onClick={() => params?.token && fetchResults(params.token)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tournament Header */}
        <Card>
          <CardHeader>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-600" />
                {results.tournament.name}
              </h1>
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(results.tournament.date)}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {results.tournament.course.name}
                </div>
              </div>
              {lastUpdated && (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                  {isRefreshing && <span className="text-blue-600">Refreshing...</span>}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setLocation(`/public/${params?.token}/kiosk`)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            data-testid="button-kiosk-mode"
          >
            <Monitor className="w-5 h-5" />
            <span>Kiosk Mode</span>
          </button>
          <button
            onClick={() => refreshResults()}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-medium"
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Results Tabs */}
        <Tabs defaultValue="gross" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gross">Gross Total</TabsTrigger>
            <TabsTrigger value="net">Net Total</TabsTrigger>
            <TabsTrigger value="skins">Gross Skins</TabsTrigger>
          </TabsList>

          {/* Gross Leaderboard */}
          <TabsContent value="gross">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Gross Total Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.gross.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No scores posted yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.gross.map((entry, index) => (
                      <div 
                        key={entry.entryId} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[3rem]">
                            <div className="font-bold text-lg">{getPositionDisplay(entry)}</div>
                            {entry.tied && (
                              <Badge variant="secondary" className="text-xs">TIED</Badge>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{entry.playerName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              CH: {entry.courseHandicap}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{entry.grossTotal}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatScore(entry.grossTotal, results.coursePar)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Net Leaderboard */}
          <TabsContent value="net">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Net Total Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.net.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No scores posted yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.net.map((entry, index) => (
                      <div 
                        key={entry.entryId} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[3rem]">
                            <div className="font-bold text-lg">{getPositionDisplay(entry)}</div>
                            {entry.tied && (
                              <Badge variant="secondary" className="text-xs">TIED</Badge>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{entry.playerName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Gross: {entry.grossTotal} • CH: {entry.courseHandicap} • Playing: {entry.playingCH}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{entry.netTotal}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatScore(entry.netTotal, results.coursePar)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skins */}
          <TabsContent value="skins">
            <div className="space-y-4">
              {/* Skins Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Skins Leaderboard
                    {results.skins.payout && results.skins.payout.potAmount > 0 && (
                      <Badge variant="secondary">
                        Pot: ${(results.skins.payout.potAmount / 100).toFixed(2)} • Total skins: {results.skins.payout.totalSkins} • Payout/skin: ${results.skins.payout.payoutPerSkin.toFixed(2)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!results.skins.payout || results.skins.payout.totalSkins === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      {results.skins.payout && results.skins.payout.potAmount > 0 ? (
                        <>
                          <p>No skins yet. Payout/skin: $0.00</p>
                          <p className="text-xs mt-1">Pot: ${(results.skins.payout.potAmount / 100).toFixed(2)} waiting for winners</p>
                        </>
                      ) : (
                        <p>No skins won yet. All holes have been pushes!</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(results.skins.perPlayer || {})
                        .map(([entryId, player]) => ({
                          entryId,
                          playerName: player.playerName,
                          skins: player.count,
                          holes: player.holes,
                          payout: results.skins.payout?.perPlayerPayouts?.[entryId] || 0
                        }))
                        .sort((a, b) => b.skins - a.skins)
                        .map((entry, index) => (
                        <div 
                          key={entry.entryId} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            index === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'
                          }`}
                        >
                          <div>
                            <h3 className="font-medium">{entry.playerName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {entry.skins} skin{entry.skins !== 1 ? 's' : ''} — holes {entry.holes.join(', ')}
                              {results.skins.payout && results.skins.payout.potAmount > 0 && entry.payout > 0 && (
                                <> (${entry.payout.toFixed(2)})</>
                              )}
                            </p>
                          </div>
                          {results.skins.payout && results.skins.payout.potAmount > 0 && entry.payout > 0 && (
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                ${entry.payout.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hole-by-Hole Skins Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Hole Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.skins.perHole.map((result) => (
                      <div 
                        key={result.hole} 
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium min-w-[3rem]">
                            H{result.hole}:
                          </span>
                        </div>
                        <div className="text-right">
                          {result.push ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              Push ({result.push.count} at {result.push.score})
                            </span>
                          ) : result.winnerName ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {result.winnerName}
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              No scores yet
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}