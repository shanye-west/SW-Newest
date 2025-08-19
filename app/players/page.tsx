'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../client/src/components/ui/button';
import { Input } from '../../client/src/components/ui/input';
import { Label } from '../../client/src/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../client/src/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../../client/src/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  email?: string;
  handicapIndex?: number;
  createdAt: Date;
}

interface PlayerFormData {
  name: string;
  email: string;
  handicapIndex: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>({
    name: '',
    email: '',
    handicapIndex: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const playerData = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      handicapIndex: formData.handicapIndex ? parseFloat(formData.handicapIndex) : undefined
    };

    try {
      const url = editingPlayer ? `/api/players/${editingPlayer.id}` : '/api/players';
      const method = editingPlayer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Player ${editingPlayer ? 'updated' : 'created'} successfully`
        });
        resetForm();
        fetchPlayers();
      } else {
        throw new Error('Failed to save player');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save player',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      email: player.email || '',
      handicapIndex: player.handicapIndex?.toString() || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Player deleted successfully'
        });
        fetchPlayers();
      } else {
        throw new Error('Failed to delete player');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete player',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', handicapIndex: '' });
    setEditingPlayer(null);
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Players</h1>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-add-player"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-player-name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-player-email"
                />
              </div>
              <div>
                <Label htmlFor="handicapIndex">Handicap Index (HI)</Label>
                <Input
                  id="handicapIndex"
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  value={formData.handicapIndex}
                  onChange={(e) => setFormData({ ...formData, handicapIndex: e.target.value })}
                  placeholder="Enter HI only (0.0 - 54.0)"
                  data-testid="input-player-handicap"
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-player"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  data-testid="button-cancel-player"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <Card key={player.id} data-testid={`player-card-${player.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg" data-testid={`player-name-${player.id}`}>
                  {player.name}
                </h3>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(player)}
                    data-testid={`button-edit-player-${player.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(player.id)}
                    data-testid={`button-delete-player-${player.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {player.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`player-email-${player.id}`}>
                  {player.email}
                </p>
              )}
              {player.handicapIndex !== undefined && (
                <p className="text-sm font-medium" data-testid={`player-handicap-${player.id}`}>
                  HI: {player.handicapIndex.toFixed(1)}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Added: {new Date(player.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {players.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No players added yet. Click "Add Player" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}