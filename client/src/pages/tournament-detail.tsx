import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Trophy, Users, Clock, UserMinus, Target, BarChart3, Share2, Copy, RefreshCw, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateHandicaps, recomputeEntryHandicaps } from '../../../lib/handicap';
import { useTournamentContext } from '../contexts/TournamentContext';

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
  group?: Group;
}

interface Group {
  id: string;
  tournamentId: string;
  name: string;
  teeTime?: string;
  entries: Entry[];
}

interface GroupFormData {
  name: string;
  teeTime: string;
}

export default function TournamentDetail() {
  const [match, params] = useRoute('/tournaments/:id');
  const [location, setLocation] = useLocation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const { setActiveTournament } = useTournamentContext();
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupFormData, setGroupFormData] = useState<GroupFormData>({
    name: '',
    teeTime: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params?.id) {
      fetchTournament(params.id);
      fetchAvailablePlayers();
      fetchEntries(params.id);
      fetchGroups(params.id);
    }
  }, [params?.id]);

  const fetchTournament = async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTournament(data);
        setShareToken(data.shareToken);
        // Set active tournament for header context
        setActiveTournament({
          id: data.id,
          name: data.name,
          date: data.date
        });
      }
    } catch (error) {
      console.error('Failed to fetch tournament:', error);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        // Only players with HI can participate
        const validPlayers = data.filter((p: Player) => p.handicapIndex !== null);
        setAvailablePlayers(validPlayers);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchEntries = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/entries`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    }
  };

  const fetchGroups = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/groups`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !tournament) return;

    setIsLoading(true);
    try {
      const selectedPlayer = availablePlayers.find(p => p.id === selectedPlayerId);
      if (!selectedPlayer) return;

      // Calculate handicaps
      const { courseHandicap, playingCH } = calculateHandicaps(
        selectedPlayer.handicapIndex,
        tournament.course.slope,
        tournament.course.rating,
        tournament.course.par,
        tournament.netAllowance
      );

      const response = await fetch(`/api/tournaments/${tournament.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          courseHandicap,
          playingCH
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Player added to tournament'
        });
        setSelectedPlayerId('');
        setIsEntryFormOpen(false);
        fetchEntries(tournament.id);
      } else {
        const error = await response.json();
        if (error.error === 'tournament_finalized') {
          throw new Error('Cannot add players to a finalized tournament');
        }
        throw new Error(error.error || 'Failed to add entry');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player to tournament',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (!confirm('Remove this player from the tournament?')) return;

    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Player removed from tournament'
        });
        fetchEntries(params!.id);
        fetchGroups(params!.id);
      } else {
        const error = await response.json();
        if (error.error === 'tournament_finalized') {
          throw new Error('Cannot remove players from a finalized tournament');
        }
        throw new Error(error.error || 'Failed to remove entry');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove player',
        variant: 'destructive'
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;

    setIsLoading(true);
    try {
      const groupData = {
        tournamentId: tournament.id,
        name: groupFormData.name.trim(),
        teeTime: groupFormData.teeTime || undefined
      };

      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Group ${editingGroup ? 'updated' : 'created'} successfully`
        });
        resetGroupForm();
        fetchGroups(tournament.id);
      } else {
        const error = await response.json();
        if (error.error === 'tournament_finalized') {
          throw new Error('Cannot modify groups in a finalized tournament');
        }
        throw new Error(error.error || 'Failed to save group');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save group',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToGroup = async (entryId: string, groupId: string | null) => {
    try {
      const response = await fetch(`/api/entries/${entryId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: groupId ? 'Player assigned to group' : 'Player removed from group'
        });
        fetchEntries(params!.id);
        fetchGroups(params!.id);
      } else {
        const error = await response.json();
        if (error.error === 'tournament_finalized') {
          throw new Error('Cannot reassign players in a finalized tournament');
        }
        throw new Error(error.error || 'Failed to assign player');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign player to group',
        variant: 'destructive'
      });
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({ name: '', teeTime: '' });
    setEditingGroup(null);
    setIsGroupFormOpen(false);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      teeTime: group.teeTime ? group.teeTime.slice(0, 5) : ''
    });
    setIsGroupFormOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Players will be unassigned.')) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Group deleted successfully'
        });
        fetchGroups(params!.id);
        fetchEntries(params!.id);
      } else {
        const error = await response.json();
        if (error.error === 'tournament_finalized') {
          throw new Error('Cannot delete groups in a finalized tournament');
        }
        throw new Error(error.error || 'Failed to delete group');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    }
  };

  const generateShareToken = async () => {
    if (!params?.id) return;
    
    setIsGeneratingToken(true);
    try {
      const response = await fetch(`/api/tournaments/${params.id}/share-token`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setShareToken(data.shareToken);
        toast({
          title: "Share link generated",
          description: "New share link created and ready to copy"
        });
      } else {
        throw new Error('Failed to generate share token');
      }
    } catch (error) {
      console.error('Error generating share token:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareToken) return;
    
    const shareUrl = `${window.location.origin}/public/${shareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard"
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard"
      });
    }
  };

  const goToLeaderboards = () => {
    setLocation(`/tournaments/${params?.id}/leaderboards`);
  };

  const handleSaveSkinsSettings = async (potAmount: number, participantsForSkins: number) => {
    if (!params?.id) return;
    
    setIsSavingSettings(true);
    try {
      const response = await fetch(`/api/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          potAmount: potAmount * 100, // Convert dollars to cents
          participantsForSkins
        })
      });
      
      if (response.ok) {
        const updatedTournament = await response.json();
        setTournament(updatedTournament);
        toast({
          title: "Settings saved",
          description: "Skins payout settings updated successfully"
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save skins settings",
        variant: "destructive"
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard"
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleGenerateShareLink = async () => {
    if (!params?.id) return;
    
    setIsGeneratingShareLink(true);
    try {
      const response = await fetch(`/api/tournaments/${params.id}/share-token`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setShareToken(data.shareToken);
        toast({
          title: "Share link generated",
          description: "Public share link is ready to use"
        });
      } else {
        throw new Error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingShareLink(false);
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
          grossPrize: grossPrize * 100, // Convert dollars to cents
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

  const handleFinalizeTournament = async () => {
    if (!tournament) return;

    const confirmed = confirm(
      'Are you sure you want to finalize this tournament? This will prevent any further scoring, entry changes, or group edits. This action can be undone later if needed.'
    );
    
    if (!confirmed) return;

    const adminPasscode = prompt('Enter admin passcode to finalize tournament:');
    if (!adminPasscode) return;

    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Passcode': adminPasscode
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTournament({
          ...tournament,
          isFinal: true,
          finalizedAt: new Date(result.finalizedAt)
        });
        toast({
          title: "Tournament finalized",
          description: "Tournament has been locked and no further changes are allowed"
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize tournament');
      }
    } catch (error: any) {
      console.error('Error finalizing tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to finalize tournament",
        variant: "destructive"
      });
    }
  };

  const handleUnlockTournament = async () => {
    if (!tournament) return;

    const confirmed = confirm(
      'Are you sure you want to unlock this tournament? This will allow scoring, entry changes, and group edits again.'
    );
    
    if (!confirmed) return;

    const adminPasscode = prompt('Enter admin passcode to unlock tournament:');
    if (!adminPasscode) return;

    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Passcode': adminPasscode
        }
      });

      if (response.ok) {
        setTournament({
          ...tournament,
          isFinal: false,
          finalizedAt: undefined
        });
        toast({
          title: "Tournament unlocked",
          description: "Tournament is now active and changes are allowed"
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock tournament');
      }
    } catch (error: any) {
      console.error('Error unlocking tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlock tournament",
        variant: "destructive"
      });
    }
  };

  if (!tournament) {
    return <div className="p-4">Loading tournament...</div>;
  }

  const availablePlayersForEntry = availablePlayers.filter(
    player => !entries.some(entry => entry.playerId === player.id)
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          {tournament.isFinal && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm font-medium">
              <Lock className="w-4 h-4" />
              <span>Tournament Finalized</span>
            </div>
          )}
        </div>
        <div className="text-right text-sm">
          <p><strong>Course:</strong> {tournament.course.name}</p>
          <p><strong>Net Allowance:</strong> {tournament.netAllowance}%</p>
          <p><strong>Passcode:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{tournament.passcode}</code></p>
          {tournament.potAmount && tournament.participantsForSkins && (
            <p><strong>Skins Pot:</strong> ${(tournament.potAmount / 100).toFixed(2)} ({tournament.participantsForSkins} participants)</p>
          )}
          {tournament.isFinal && tournament.finalizedAt && (
            <p className="text-red-600 dark:text-red-400 font-medium">
              <strong>Finalized:</strong> {new Date(tournament.finalizedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="leaderboards">Results</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tournament Entries</h2>
            <Button 
              onClick={() => setIsEntryFormOpen(true)}
              disabled={availablePlayersForEntry.length === 0 || tournament.isFinal}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-add-entry"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Player
              {tournament.isFinal && (
                <Lock className="w-3 h-3 ml-1" />
              )}
            </Button>
          </div>

          {isEntryFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Add Player to Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEntry} className="space-y-4">
                  <div>
                    <Label htmlFor="playerId">Select Player</Label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger data-testid="select-entry-player">
                        <SelectValue placeholder="Choose a player" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayersForEntry.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name} (HI: {player.handicapIndex})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading || !selectedPlayerId}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-save-entry"
                    >
                      {isLoading ? 'Adding...' : 'Add Player'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsEntryFormOpen(false);
                        setSelectedPlayerId('');
                      }}
                      data-testid="button-cancel-entry"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left">Player</th>
                  <th className="border border-gray-200 p-3 text-center">HI</th>
                  <th className="border border-gray-200 p-3 text-center">CH</th>
                  <th className="border border-gray-200 p-3 text-center">Playing CH</th>
                  <th className="border border-gray-200 p-3 text-center">Paid</th>
                  <th className="border border-gray-200 p-3 text-center">Group</th>
                  <th className="border border-gray-200 p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} data-testid={`entry-row-${entry.id}`}>
                    <td className="border border-gray-200 p-3">
                      <div>
                        <div className="font-medium">{entry.player.name}</div>
                        {entry.player.email && (
                          <div className="text-sm text-gray-500">{entry.player.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      {entry.player.handicapIndex}
                    </td>
                    <td className="border border-gray-200 p-3 text-center font-medium">
                      {entry.courseHandicap}
                    </td>
                    <td className="border border-gray-200 p-3 text-center font-medium">
                      {entry.playingCH}
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      <input
                        type="checkbox"
                        checked={entry.hasPaid || false}
                        onChange={(e) => handleUpdatePayment(entry.id, e.target.checked)}
                        disabled={tournament.isFinal}
                        className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                        data-testid={`checkbox-payment-${entry.id}`}
                      />
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      <Select
                        value={entry.groupId || 'unassigned'}
                        onValueChange={(value) => 
                          handleAssignToGroup(entry.id, value === 'unassigned' ? null : value)
                        }
                        disabled={tournament.isFinal}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveEntry(entry.id)}
                        disabled={tournament.isFinal}
                        data-testid={`button-remove-entry-${entry.id}`}
                      >
                        <UserMinus className="w-4 h-4" />
                        {tournament.isFinal && <Lock className="w-3 h-3 ml-1" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {entries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No players added to tournament yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tournament Groups</h2>
            <Button 
              onClick={() => setIsGroupFormOpen(true)}
              disabled={tournament.isFinal}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-add-group"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
              {tournament.isFinal && <Lock className="w-3 h-3 ml-1" />}
            </Button>
          </div>

          {isGroupFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      placeholder="e.g., Group A, Morning Flight"
                      required
                      data-testid="input-group-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teeTime">Tee Time (Optional)</Label>
                    <Input
                      id="teeTime"
                      type="time"
                      value={groupFormData.teeTime}
                      onChange={(e) => setGroupFormData({ ...groupFormData, teeTime: e.target.value })}
                      data-testid="input-group-teetime"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-save-group"
                    >
                      {isLoading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetGroupForm}
                      data-testid="button-cancel-group"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id} data-testid={`group-card-${group.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {group.name}
                      </CardTitle>
                      {group.teeTime && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(group.teeTime).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/tournaments/${tournament.id}/score/${group.id}`)}
                        data-testid={`button-score-group-${group.id}`}
                      >
                        <Target className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditGroup(group)}
                        disabled={tournament.isFinal}
                        data-testid={`button-edit-group-${group.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                        {tournament.isFinal && <Lock className="w-3 h-3 ml-1" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={tournament.isFinal}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        {tournament.isFinal && <Lock className="w-3 h-3 ml-1" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Players ({group.entries?.length || 0}):
                    </p>
                    {group.entries?.length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {group.entries.map((entry) => (
                          <li key={entry.id} className="flex justify-between">
                            <span>{entry.player.name}</span>
                            <span className="text-gray-500">CH: {entry.playingCH}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No players assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">No groups created yet. Click "Create Group" to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leaderboards Tab */}
        <TabsContent value="leaderboards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Tournament Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                View live leaderboards, USGA tiebreakers, and gross skins results.
              </p>
              <Button 
                onClick={() => setLocation(`/tournaments/${tournament.id}/leaderboards`)}
                data-testid="button-view-leaderboards"
              >
                <Trophy className="w-4 h-4 mr-2" />
                View Leaderboards
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Tab */}
        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Hole-by-Hole Scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Score rounds hole-by-hole with offline support and automatic sync.
              </p>
              {groups.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium">Select a group to start scoring:</p>
                  <div className="grid gap-2">
                    {groups.map(group => (
                      <Button 
                        key={group.id}
                        variant="outline" 
                        onClick={() => setLocation(`/tournaments/${tournament.id}/score/${group.id}`)}
                        className="justify-between"
                        data-testid={`button-score-group-quick-${group.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {group.name} ({group.entries?.length || 0} players)
                        </span>
                        {group.teeTime && (
                          <span className="text-sm text-gray-500">
                            {new Date(group.teeTime).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Create groups first to enable scoring.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Tournament Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Skins Payout Configuration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure the pot amount and number of participants for skins payout calculation. 
                  Payout per skin is computed as pot ÷ total skins. If zero skins, payout is $0.00.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skinsBuyIn">Skins Buy-in per Player ($)</Label>
                    <Input
                      id="skinsBuyIn"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={tournament.potAmount && tournament.participantsForSkins 
                        ? ((tournament.potAmount / 100) / tournament.participantsForSkins).toFixed(2) 
                        : ''}
                      data-testid="input-skins-buyin"
                    />
                    <p className="text-xs text-gray-500">Buy-in amount per participant</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="participantsForSkins">Participants Count</Label>
                    <Input
                      id="participantsForSkins"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      defaultValue={tournament.participantsForSkins?.toString() || ''}
                      data-testid="input-participants-for-skins"
                    />
                    <p className="text-xs text-gray-500">Number of players participating in skins</p>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    <strong>Total Skins Pot:</strong> $
                    {(() => {
                      const buyIn = parseFloat((document.getElementById('skinsBuyIn') as HTMLInputElement)?.value || '0') || 0;
                      const participants = parseInt((document.getElementById('participantsForSkins') as HTMLInputElement)?.value || '0') || 0;
                      return (buyIn * participants).toFixed(2);
                    })()}
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    const buyInInput = document.getElementById('skinsBuyIn') as HTMLInputElement;
                    const participantsInput = document.getElementById('participantsForSkins') as HTMLInputElement;
                    
                    const buyIn = parseFloat(buyInInput.value) || 0;
                    const participants = parseInt(participantsInput.value) || 0;
                    const totalPot = buyIn * participants;
                    
                    handleSaveSkinsSettings(totalPot, participants);
                  }}
                  disabled={isSavingSettings}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-skins-settings"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Skins Settings'}
                </Button>
              </div>

              {/* Gross and Net Prize Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Prize Configuration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set buy-in amounts per player for gross and net competition prize pools.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossBuyIn">Gross Buy-in per Player ($)</Label>
                    <Input
                      id="grossBuyIn"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={tournament.grossPrize && entries.length > 0 
                        ? ((tournament.grossPrize / 100) / entries.length).toFixed(2) 
                        : ''}
                      data-testid="input-gross-buyin"
                    />
                    <p className="text-xs text-gray-500">Buy-in per player for gross prize</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="netBuyIn">Net Buy-in per Player ($)</Label>
                    <Input
                      id="netBuyIn"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={tournament.netPrize && entries.length > 0 
                        ? ((tournament.netPrize / 100) / entries.length).toFixed(2) 
                        : ''}
                      data-testid="input-net-buyin"
                    />
                    <p className="text-xs text-gray-500">Buy-in per player for net prize</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prize Pool Summary</Label>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm space-y-1">
                        <p><strong>Gross Prize Pool:</strong> $
                          {(() => {
                            const grossBuyIn = parseFloat((document.getElementById('grossBuyIn') as HTMLInputElement)?.value || '0') || 0;
                            return (grossBuyIn * entries.length).toFixed(2);
                          })()}
                        </p>
                        <p><strong>Net Prize Pool:</strong> $
                          {(() => {
                            const netBuyIn = parseFloat((document.getElementById('netBuyIn') as HTMLInputElement)?.value || '0') || 0;
                            return (netBuyIn * entries.length).toFixed(2);
                          })()}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Based on {entries.length} current entries
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    const grossBuyInInput = document.getElementById('grossBuyIn') as HTMLInputElement;
                    const netBuyInInput = document.getElementById('netBuyIn') as HTMLInputElement;
                    
                    const grossBuyIn = parseFloat(grossBuyInInput.value) || 0;
                    const netBuyIn = parseFloat(netBuyInInput.value) || 0;
                    const grossPrizeTotal = grossBuyIn * entries.length;
                    const netPrizeTotal = netBuyIn * entries.length;
                    
                    handleSavePrizeSettings(grossPrizeTotal, netPrizeTotal);
                  }}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-prize-settings"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Prize Settings'}
                </Button>
                
                {(tournament.grossPrize || tournament.netPrize) && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Current Prize Settings</h4>
                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
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

              {/* Tournament Finalization Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium">Tournament Finalization</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Finalize this tournament to prevent any further scoring, roster changes, or group edits. 
                  This action creates an audit trail and locks the tournament results.
                </p>
                
                {tournament.isFinal ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Lock className="w-5 h-5 text-red-600" />
                        <h4 className="font-medium text-red-800 dark:text-red-200">Tournament Finalized</h4>
                      </div>
                      {tournament.finalizedAt && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Finalized on {new Date(tournament.finalizedAt).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        No further changes to scores, entries, or groups are allowed.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleUnlockTournament()}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      data-testid="button-unlock-tournament"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Tournament
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Tournament Active</h4>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Scores, entries, and groups can still be modified.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleFinalizeTournament()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      data-testid="button-finalize-tournament"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Finalize Tournament
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Share Tab */}
        <TabsContent value="share">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Public Tournament Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate a public share link that allows anyone to view live tournament results without admin access. 
                The link shows real-time leaderboards for Gross, Net, and Skins competitions.
              </p>

              {shareToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Share Link Active</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={`${window.location.origin}/public/${shareToken}`}
                        readOnly
                        className="bg-white dark:bg-gray-800 text-sm"
                        data-testid="input-share-url"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(`${window.location.origin}/public/${shareToken}`)}
                        data-testid="button-copy-share-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.open(`/public/${shareToken}`, '_blank')}
                    variant="outline"
                    data-testid="button-view-public-results"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    View Public Results
                  </Button>
                  
                  <Button
                    onClick={() => window.open(`/kiosk/${shareToken}`, '_blank')}
                    variant="outline"
                    data-testid="button-open-kiosk-mode"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Open Kiosk/TV Mode
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateShareLink}
                  disabled={isGeneratingShareLink}
                  data-testid="button-generate-share-link"
                >
                  {isGeneratingShareLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}