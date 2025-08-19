import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, RefreshCw, Trash2, Settings, Eye } from 'lucide-react';

interface ConflictEntry {
  id: string;
  tournamentId: string;
  tournamentName: string;
  groupId?: string;
  groupName?: string;
  entryId: string;
  playerName: string;
  hole: number;
  incomingStrokes: number;
  incomingAt: string;
  storedStrokes: number;
  storedAt: string;
  resolved?: boolean;
  resolvedAt?: string;
}

interface AuthHeaders {
  'x-tournament-id': string;
  'x-admin-passcode': string;
}

function makeAuthHeaders(tournamentId: string, passcode: string): AuthHeaders {
  return {
    'x-tournament-id': tournamentId,
    'x-admin-passcode': passcode
  };
}

export default function AdminConflicts() {
  const [tournamentId, setTournamentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [playerFilter, setPlayerFilter] = useState('');
  const [holeFilter, setHoleFilter] = useState('');
  
  // Force dialog state
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictEntry | null>(null);
  const [forceValue, setForceValue] = useState('');

  const { toast } = useToast();

  const fetchConflicts = async () => {
    if (!tournamentId || !passcode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers = {
        ...makeAuthHeaders(tournamentId, passcode),
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(`/api/admin/conflicts/recent?tournamentId=${tournamentId}`, {
        headers
      });
      
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Invalid tournament ID or passcode');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conflicts: ${response.status}`);
      }
      
      const data = await response.json();
      setConflicts(data.conflicts || []);
      setAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conflicts';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflict: ConflictEntry, action: 'apply-server' | 'force-local', forceValue?: number) => {
    try {
      const headers = {
        ...makeAuthHeaders(tournamentId, passcode),
        'Content-Type': 'application/json'
      };
      
      const response = await fetch('/api/admin/conflicts/resolve', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tournamentId: conflict.tournamentId,
          entryId: conflict.entryId,
          hole: conflict.hole,
          action,
          ...(forceValue !== undefined && { forceValue })
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resolve conflict');
      }
      
      const result = await response.json();
      
      // Remove resolved conflict from list
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
      
      toast({
        title: "Conflict Resolved",
        description: action === 'apply-server' 
          ? `Applied server value for ${conflict.playerName}, hole ${conflict.hole}`
          : `Forced local value (${forceValue || conflict.incomingStrokes}) for ${conflict.playerName}, hole ${conflict.hole}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve conflict';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const clearConflicts = async () => {
    try {
      const headers = {
        ...makeAuthHeaders(tournamentId, passcode),
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(`/api/admin/conflicts/clear?tournamentId=${tournamentId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear conflicts');
      }
      
      const result = await response.json();
      setConflicts([]);
      
      toast({
        title: "Conflicts Cleared",
        description: `Cleared ${result.clearedCount} conflicts`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear conflicts';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const openForceDialog = (conflict: ConflictEntry) => {
    setSelectedConflict(conflict);
    setForceValue(conflict.incomingStrokes.toString());
    setForceDialogOpen(true);
  };

  const handleForceLocal = () => {
    if (selectedConflict) {
      const value = parseInt(forceValue);
      if (isNaN(value) || value < 1 || value > 15) {
        toast({
          title: "Invalid Value",
          description: "Strokes must be between 1 and 15",
          variant: "destructive"
        });
        return;
      }
      resolveConflict(selectedConflict, 'force-local', value);
      setForceDialogOpen(false);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Filter conflicts
  const filteredConflicts = conflicts.filter(conflict => {
    const matchesPlayer = !playerFilter || 
      conflict.playerName.toLowerCase().includes(playerFilter.toLowerCase());
    const matchesHole = !holeFilter || 
      conflict.hole.toString() === holeFilter;
    return matchesPlayer && matchesHole;
  });

  // Get unique holes for filter dropdown
  const availableHoles = Array.from(new Set(conflicts.map(c => c.hole))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Conflicts Review
          </h1>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Last-Write-Wins
          </Badge>
        </div>

        {/* Authentication Card */}
        {!authenticated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tournament Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournamentId">Tournament ID</Label>
                  <Input
                    id="tournamentId"
                    value={tournamentId}
                    onChange={(e) => setTournamentId(e.target.value)}
                    placeholder="Enter tournament ID"
                    data-testid="input-tournament-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passcode">Admin Passcode</Label>
                  <Input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    data-testid="input-passcode"
                  />
                </div>
              </div>
              <Button 
                onClick={fetchConflicts} 
                disabled={!tournamentId || !passcode || loading}
                className="w-full"
                data-testid="button-authenticate"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Access Conflicts'
                )}
              </Button>
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conflicts Management */}
        {authenticated && (
          <>
            {/* Filters and Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Conflicts ({filteredConflicts.length})</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchConflicts}
                      disabled={loading}
                      data-testid="button-refresh"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearConflicts}
                      disabled={conflicts.length === 0}
                      data-testid="button-clear-all"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerFilter">Filter by Player</Label>
                    <Input
                      id="playerFilter"
                      value={playerFilter}
                      onChange={(e) => setPlayerFilter(e.target.value)}
                      placeholder="Search player name..."
                      data-testid="input-player-filter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holeFilter">Filter by Hole</Label>
                    <Select value={holeFilter} onValueChange={setHoleFilter}>
                      <SelectTrigger data-testid="select-hole-filter">
                        <SelectValue placeholder="All holes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All holes</SelectItem>
                        {availableHoles.map(hole => (
                          <SelectItem key={hole} value={hole.toString()}>
                            Hole {hole}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tournament</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                      {conflicts[0]?.tournamentName || 'No conflicts'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conflicts List */}
            {filteredConflicts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Conflicts Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {conflicts.length === 0 
                      ? 'All scores are synchronized without conflicts.'
                      : 'No conflicts match your current filters.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredConflicts.map((conflict) => (
                  <Card key={conflict.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* Player & Hole Info */}
                        <div className="lg:col-span-3">
                          <h3 className="font-semibold text-lg" data-testid={`conflict-player-${conflict.id}`}>
                            {conflict.playerName}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Hole {conflict.hole}
                            {conflict.groupName && ` • ${conflict.groupName}`}
                          </div>
                        </div>

                        {/* Conflict Details */}
                        <div className="lg:col-span-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <div className="text-sm font-medium text-red-800 dark:text-red-300">
                                Incoming (Ignored)
                              </div>
                              <div className="text-xl font-bold text-red-900 dark:text-red-200">
                                {conflict.incomingStrokes} strokes
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400">
                                {formatTimestamp(conflict.incomingAt)}
                              </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                              <div className="text-sm font-medium text-green-800 dark:text-green-300">
                                Stored (Current)
                              </div>
                              <div className="text-xl font-bold text-green-900 dark:text-green-200">
                                {conflict.storedStrokes} strokes
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {formatTimestamp(conflict.storedAt)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-3 flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveConflict(conflict, 'apply-server')}
                            className="w-full"
                            data-testid={`button-apply-server-${conflict.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Apply Server
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openForceDialog(conflict)}
                            className="w-full"
                            data-testid={`button-force-local-${conflict.id}`}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Force Local
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Force Local Dialog */}
        <Dialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
          <DialogContent data-testid="dialog-force-local">
            <DialogHeader>
              <DialogTitle>Force Local Value</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedConflict && (
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Forcing local value for <strong>{selectedConflict.playerName}</strong> on hole <strong>{selectedConflict.hole}</strong>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forceValue">Strokes (1-15)</Label>
                    <Input
                      id="forceValue"
                      type="number"
                      min="1"
                      max="15"
                      value={forceValue}
                      onChange={(e) => setForceValue(e.target.value)}
                      data-testid="input-force-value"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setForceDialogOpen(false)}
                      data-testid="button-cancel-force"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleForceLocal}
                      data-testid="button-confirm-force"
                    >
                      Force Value
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}