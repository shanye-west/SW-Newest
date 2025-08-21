import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Coins } from "lucide-react";

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
  groupId?: string; // Add groupId for navigation
}

interface SkinsResult {
  hole: number;
  par: number;
  winner: string | null;
  winnerScore: number | null;
  isPush: boolean;
  pushCount?: number;
  pushScore?: number;
}

interface SkinsLeaderboard {
  playerName: string;
  entryId: string;
  skins: number;
  payout: number;
}

export default function Leaderboards() {
  const [match, params] = useRoute("/tournaments/:id/leaderboards");
  const [, setLocation] = useLocation();
  const [grossLeaderboard, setGrossLeaderboard] = useState<LeaderboardEntry[]>(
    [],
  );
  const [netLeaderboard, setNetLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [skinsResults, setSkinsResults] = useState<SkinsResult[]>([]);
  const [skinsLeaderboard, setSkinsLeaderboard] = useState<SkinsLeaderboard[]>(
    [],
  );
  const [coursePar, setCoursePar] = useState(72);
  const [potAmount, setPotAmount] = useState<number | null>(null);
  const [totalSkins, setTotalSkins] = useState(0);
  const [payoutPerSkin, setPayoutPerSkin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchLeaderboards(params.id);
      fetchSkins(params.id);

      // Set up polling for live updates
      const interval = setInterval(() => {
        fetchLeaderboards(params.id);
        fetchSkins(params.id);
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [params?.id]);

  const fetchLeaderboards = async (tournamentId: string) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/leaderboards`,
      );
      if (response.ok) {
        const data = await response.json();
        setGrossLeaderboard(data.gross);
        setNetLeaderboard(data.net);
        setCoursePar(data.coursePar);
        setLastUpdated(new Date(data.updated));
      }
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkins = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/skins`);
      if (response.ok) {
        const data = await response.json();
        setSkinsResults(data.results || []);

        // Convert leaderboard array to the expected format
        const leaderboard = (data.leaderboard || []).map((player: any) => ({
          playerName: player.playerName,
          entryId: player.entryId,
          skins: player.skins,
          payout: (player.payout || 0) / 100, // Convert cents to dollars
        }));

        setSkinsLeaderboard(leaderboard);
        setTotalSkins(data.totalSkins || 0);
        setPotAmount(data.potAmount ? data.potAmount / 100 : null);
        setPayoutPerSkin((data.payoutPerSkin || 0) / 100); // Convert cents to dollars
      }
    } catch (error) {
      console.error("Error fetching skins:", error);
    }
  };

  const formatScore = (toPar: number): string => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const handlePlayerClick = (entry: LeaderboardEntry) => {
    if (entry.groupId && params?.id) {
      setLocation(`/tournaments/${params.id}/score/${entry.groupId}`);
    }
  };

  const getPositionDisplay = (entry: LeaderboardEntry): string => {
    return entry.tied ? `T-${entry.position}` : `${entry.position}`;
  };

  if (!match) return null;

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading leaderboards...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          Leaderboards
        </h1>
        {lastUpdated && (
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

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
              <div className="space-y-3">
                {grossLeaderboard.map((entry, index) => (
                  <div
                    key={entry.entryId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index < 3
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[3rem]">
                        <div className="font-bold text-lg">
                          {getPositionDisplay(entry)}
                        </div>
                        {entry.tied && (
                          <Badge variant="secondary" className="text-xs">
                            TIED
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handlePlayerClick(entry)}
                          data-testid={`link-player-${entry.entryId}`}
                        >
                          {entry.playerName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {" "}
                          {entry.courseHandicap}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {formatScore(entry.toPar)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total: {entry.grossTotal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="space-y-3">
                {netLeaderboard.map((entry, index) => (
                  <div
                    key={entry.entryId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index < 3
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[3rem]">
                        <div className="font-bold text-lg">
                          {getPositionDisplay(entry)}
                        </div>
                        {entry.tied && (
                          <Badge variant="secondary" className="text-xs">
                            TIED
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handlePlayerClick(entry)}
                          data-testid={`link-player-${entry.entryId}`}
                        >
                          {entry.playerName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Course Handicap: {entry.courseHandicap}{" "}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {formatScore(entry.netToPar)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Net Total: {entry.netTotal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                  {potAmount ? (
                    <Badge variant="secondary">
                      Pot: ${potAmount.toFixed(2)} • Total skins: {totalSkins} •
                      Payout/skin: ${payoutPerSkin.toFixed(2)}
                    </Badge>
                  ) : totalSkins > 0 ? (
                    <Badge variant="outline">
                      {totalSkins} total skins • No pot configured
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalSkins === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {potAmount ? (
                      <>
                        <p>No skins yet. Payout/skin: $0.00</p>
                        <p className="text-xs mt-1">
                          Pot: ${potAmount.toFixed(2)} waiting for winners
                        </p>
                      </>
                    ) : (
                      <p>No skins won yet. All holes have been pushes!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {skinsLeaderboard.map((entry, index) => (
                      <div
                        key={entry.entryId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === 0
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div>
                          <h3 className="font-medium">{entry.playerName}</h3>
                          <p className="text-sm text-gray-600">
                            {entry.skins} skin{entry.skins !== 1 ? "s" : ""}
                            {potAmount &&
                              entry.payout > 0 &&
                              ` (${entry.payout.toFixed(2)})`}
                          </p>
                        </div>
                        {potAmount && entry.payout > 0 && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
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
                  {skinsResults.map((result) => (
                    <div
                      key={result.hole}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[3rem]">
                          H{result.hole}:
                        </span>
                        <span className="text-sm text-gray-600">
                          Par {result.par}
                        </span>
                      </div>
                      <div className="text-right">
                        {result.isPush ? (
                          <span className="text-orange-600">
                            Push ({result.pushCount} players tied with {result.pushScore})
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            {result.winner} ({result.winnerScore})
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
  );
}
