'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  date: string;
  course: {
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
  tournamentId: string;
  teeTime: Date | null;
  createdAt: Date;
  tournament: Tournament;
}

interface GroupFormData {
  name: string;
  tournamentId: string;
  teeTime: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    tournamentId: '',
    teeTime: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
    fetchTournaments();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments');
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const groupData = {
      name: formData.name.trim(),
      tournamentId: formData.tournamentId,
      teeTime: formData.teeTime ? new Date(formData.teeTime).toISOString() : null
    };

    try {
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
        resetForm();
        fetchGroups();
      } else {
        throw new Error('Failed to save group');
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

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      tournamentId: group.tournamentId,
      teeTime: group.teeTime ? new Date(group.teeTime).toISOString().slice(0, 16) : ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Group deleted successfully'
        });
        fetchGroups();
      } else {
        throw new Error('Failed to delete group');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', tournamentId: '', teeTime: '' });
    setEditingGroup(null);
    setIsFormOpen(false);
  };

  const formatTeeTime = (teeTime: Date | null) => {
    if (!teeTime) return 'No tee time set';
    return new Date(teeTime).toLocaleString();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-add-group"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingGroup ? 'Edit Group' : 'Add New Group'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Group A, Morning Flight"
                  data-testid="input-group-name"
                />
              </div>

              <div>
                <Label htmlFor="tournamentId">Tournament *</Label>
                <Select
                  value={formData.tournamentId}
                  onValueChange={(value) => setFormData({ ...formData, tournamentId: value })}
                >
                  <SelectTrigger data-testid="select-group-tournament">
                    <SelectValue placeholder="Select a tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name} - {new Date(tournament.date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teeTime">Tee Time</Label>
                <Input
                  id="teeTime"
                  type="datetime-local"
                  value={formData.teeTime}
                  onChange={(e) => setFormData({ ...formData, teeTime: e.target.value })}
                  data-testid="input-group-tee-time"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-group"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
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
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg" data-testid={`group-name-${group.id}`}>
                  {group.name}
                </h3>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(group)}
                    data-testid={`button-edit-group-${group.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(group.id)}
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  <span data-testid={`group-tournament-${group.id}`}>
                    {group.tournament.name}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  <span data-testid={`group-tee-time-${group.id}`}>
                    {formatTeeTime(group.teeTime)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Course: {group.tournament.course.name}
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Created: {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No groups created yet. Click "Add Group" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}