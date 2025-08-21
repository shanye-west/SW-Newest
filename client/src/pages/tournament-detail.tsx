import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Trophy, Users, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  date: string;
  courseId: string;
  netAllowance: number;
  passcode: string;
  potAmount?: number; // in cents
  participantsForSkins?: number;
  grossPrize?: number; // in cents
  netPrize?: number; // in cents
  isFinal: boolean;
  finalizedAt?: Date;
  course: {
    name: string;
    par: number;
    slope: number;
    rating: number;
  };
}

interface Player {
  id: string;
  name: string;
  email?: string;
  handicapIndex: number;
}

interface Entry {
  id: string;
  tournamentId: string;
  playerId: string;
  courseHandicap: number;
  playingCH: number;
  groupId?: string;
  hasPaid?: boolean;
  player: Player;
}

export default function TournamentDetail() {
  const [match, params] = useRoute('/tournaments/:id');
  const [location, setLocation] = useLocation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params?.id) {
      fetchTournament();
      fetchEntries();
      fetchAvailablePlayers();
    }
  }, [params?.id]);

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params?.id}`);
      if (response.ok) {
        const data = await response.json();
        setTournament(data);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await fetch(`/api/tournaments/${params?.id}/entries`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setAvailablePlayers(data);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSavePrizeSettings = async (grossPrize: number, netPrize: number) => {
    if (!params?.id) return;
    
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grossPrize: grossPrize * 100,
          netPrize: netPrize * 100
        })
      });
      
      if (response.ok) {
        const updatedTournament = await response.json();
        setTournament(updatedTournament);
        toast({
          title: "Prize settings saved",
          description: "Gross and net prize amounts updated successfully"
        });
      } else {
        throw new Error('Failed to save prize settings');
      }
    } catch (error) {
      console.error('Error saving prize settings:', error);
      toast({
        title: "Error",
        description: "Failed to save prize settings",
        variant: "destructive"
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdatePayment = async (entryId: string, hasPaid: boolean) => {
    if (!params?.id) return;
    
    try {
      const response = await fetch(`/api/tournaments/${params.id}/entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hasPaid })
      });
      
      if (response.ok) {
        setEntries(prev => prev.map(entry => 
          entry.id === entryId ? { ...entry, hasPaid } : entry
        ));
        toast({
          title: "Payment status updated",
          description: `Entry fee payment ${hasPaid ? 'marked as paid' : 'marked as unpaid'}`
        });
      } else {
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  if (!tournament) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-4" />
          <p>Loading tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {tournament.course.name} • {new Date(tournament.date).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={() => setLocation('/tournaments')} variant="outline">
          ← Back to Tournaments
        </Button>
      </div>

      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Tournament Entries ({entries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entries.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Entries Yet</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add players to start building your tournament roster.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{entry.player.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span>HI: {entry.player.handicapIndex}</span>
                                <span>CH: {entry.courseHandicap}</span>
                                <span>Playing: {entry.playingCH}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Entry Fee Paid:</label>
                                <input
                                  type="checkbox"
                                  checked={entry.hasPaid || false}
                                  onChange={(e) => handleUpdatePayment(entry.id, e.target.checked)}
                                  disabled={tournament.isFinal}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                  data-testid={`checkbox-payment-${entry.id}`}
                                />
                                <span className={`text-sm ${entry.hasPaid ? 'text-green-600' : 'text-red-600'}`}>
                                  {entry.hasPaid ? '✓ Paid' : '✗ Unpaid'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>Payment Status:</strong></p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-green-600">
                            Paid: {entries.filter(e => e.hasPaid).length}
                          </span>
                          <span className="text-red-600">
                            Unpaid: {entries.filter(e => !e.hasPaid).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prize Money Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Prize Money</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gross-prize">Gross Prize ($)</Label>
                    <Input
                      id="gross-prize"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={tournament.grossPrize ? (tournament.grossPrize / 100).toFixed(2) : ''}
                      data-testid="input-gross-prize"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="net-prize">Net Prize ($)</Label>
                    <Input
                      id="net-prize"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={tournament.netPrize ? (tournament.netPrize / 100).toFixed(2) : ''}
                      data-testid="input-net-prize"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    const grossInput = document.getElementById('gross-prize') as HTMLInputElement;
                    const netInput = document.getElementById('net-prize') as HTMLInputElement;
                    
                    const grossPrize = parseFloat(grossInput.value) || 0;
                    const netPrize = parseFloat(netInput.value) || 0;
                    
                    handleSavePrizeSettings(grossPrize, netPrize);
                  }}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-prize-settings"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Prize Settings'
                  )}
                </Button>
                
                {(tournament.grossPrize || tournament.netPrize) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Current Prize Money</h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      {tournament.grossPrize && (
                        <p><strong>Gross Prize:</strong> ${(tournament.grossPrize / 100).toFixed(2)}</p>
                      )}
                      {tournament.netPrize && (
                        <p><strong>Net Prize:</strong> ${(tournament.netPrize / 100).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboards Tab */}
        <TabsContent value="leaderboards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Tournament Leaderboards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Leaderboards Coming Soon</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View live tournament results and standings here once scoring begins.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}