import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  date: string;
  courseId: string;
  course?: { name: string };
  netAllowance: number;
  status: string;
  createdAt: Date;
}

interface Course {
  id: string;
  name: string;
}

interface TournamentFormData {
  name: string;
  date: string;
  courseId: string;
  netAllowance: string;
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
    netAllowance: '100'
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
      status: 'upcoming'
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
      netAllowance: tournament.netAllowance.toString()
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
    setFormData({ name: '', date: '', courseId: '', netAllowance: '100' });
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
              <div>
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Medal, Club Championship"
                  required
                  data-testid="input-tournament-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Tournament Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="input-tournament-date"
                  />
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
                    data-testid="input-tournament-allowance"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="courseId">Course *</Label>
                <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} data-testid={`tournament-card-${tournament.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-lg" data-testid={`tournament-name-${tournament.id}`}>
                    {tournament.name}
                  </h3>
                </div>
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
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Date:</span> {new Date(tournament.date).toLocaleDateString()}</p>
                <p><span className="font-medium">Course:</span> {tournament.course?.name || 'Unknown'}</p>
                <p><span className="font-medium">Net Allowance:</span> {tournament.netAllowance}%</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    tournament.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                    tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tournament.status}
                  </span>
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Created: {new Date(tournament.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tournaments.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No tournaments created yet. Click "Add Tournament" to get started.</p>
            {courses.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Note: You'll need to add courses before creating tournaments.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}