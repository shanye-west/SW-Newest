'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  par: number;
  slope: number;
  rating: number;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  courseId: string;
  holes: number;
  netAllowance: number;
  passcode: string;
  potAmount?: number;
  participantsForSkins?: number;
  skinsCarry: boolean;
  createdAt: Date;
  course: Course;
}

interface TournamentFormData {
  name: string;
  date: string;
  courseId: string;
  netAllowance: string;
  passcode: string;
  potAmount: string;
  participantsForSkins: string;
  skinsCarry: boolean;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    date: '',
    courseId: '',
    netAllowance: '100',
    passcode: '',
    potAmount: '',
    participantsForSkins: '',
    skinsCarry: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
    fetchCourses();
  }, []);

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

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const tournamentData = {
      name: formData.name.trim(),
      date: formData.date,
      courseId: formData.courseId,
      netAllowance: parseInt(formData.netAllowance),
      passcode: formData.passcode.trim(),
      potAmount: formData.potAmount ? parseInt(formData.potAmount) : undefined,
      participantsForSkins: formData.participantsForSkins ? parseInt(formData.participantsForSkins) : undefined,
      skinsCarry: formData.skinsCarry
    };

    try {
      const url = editingTournament ? `/api/tournaments/${editingTournament.id}` : '/api/tournaments';
      const method = editingTournament ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Tournament ${editingTournament ? 'updated' : 'created'} successfully`
        });
        resetForm();
        fetchTournaments();
      } else {
        throw new Error('Failed to save tournament');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save tournament',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      date: tournament.date,
      courseId: tournament.courseId,
      netAllowance: tournament.netAllowance.toString(),
      passcode: tournament.passcode,
      potAmount: tournament.potAmount?.toString() || '',
      participantsForSkins: tournament.participantsForSkins?.toString() || '',
      skinsCarry: tournament.skinsCarry
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Tournament deleted successfully'
        });
        fetchTournaments();
      } else {
        throw new Error('Failed to delete tournament');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      courseId: '',
      netAllowance: '100',
      passcode: '',
      potAmount: '',
      participantsForSkins: '',
      skinsCarry: false
    });
    setEditingTournament(null);
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-add-tournament"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tournament
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTournament ? 'Edit Tournament' : 'Add New Tournament'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-tournament-name"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="input-tournament-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseId">Course *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                  >
                    <SelectTrigger data-testid="select-tournament-course">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="netAllowance">Net Allowance (%)</Label>
                  <Input
                    id="netAllowance"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.netAllowance}
                    onChange={(e) => setFormData({ ...formData, netAllowance: e.target.value })}
                    data-testid="input-tournament-net-allowance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passcode">Passcode *</Label>
                  <Input
                    id="passcode"
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    required
                    minLength={4}
                    data-testid="input-tournament-passcode"
                  />
                </div>
                <div>
                  <Label htmlFor="potAmount">Pot Amount ($)</Label>
                  <Input
                    id="potAmount"
                    type="number"
                    min="0"
                    value={formData.potAmount}
                    onChange={(e) => setFormData({ ...formData, potAmount: e.target.value })}
                    data-testid="input-tournament-pot"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="participantsForSkins">Participants for Skins</Label>
                <Input
                  id="participantsForSkins"
                  type="number"
                  min="1"
                  value={formData.participantsForSkins}
                  onChange={(e) => setFormData({ ...formData, participantsForSkins: e.target.value })}
                  data-testid="input-tournament-participants"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-tournament"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  data-testid="button-cancel-tournament"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} data-testid={`tournament-card-${tournament.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg" data-testid={`tournament-name-${tournament.id}`}>
                  {tournament.name}
                </h3>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(tournament)}
                    data-testid={`button-edit-tournament-${tournament.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(tournament.id)}
                    data-testid={`button-delete-tournament-${tournament.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span data-testid={`tournament-date-${tournament.id}`}>
                    {new Date(tournament.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span data-testid={`tournament-course-${tournament.id}`}>
                    {tournament.course.name}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Net Allowance:</span> {tournament.netAllowance}%
                </div>
                <div className="text-sm">
                  <span className="font-medium">Passcode:</span> {tournament.passcode}
                </div>
                {tournament.potAmount && (
                  <div className="text-sm">
                    <span className="font-medium">Pot:</span> ${tournament.potAmount}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tournaments.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No tournaments created yet. Click "Add Tournament" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}