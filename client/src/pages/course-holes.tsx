// Course Holes Editor
import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import type { CourseHole } from '../../../shared/schema';

export function CourseHolesPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch course holes
  const { data: holes, isLoading } = useQuery({
    queryKey: ['/api/courses', id, 'holes'],
    queryFn: () => apiRequest(`/api/courses/${id}/holes`),
    enabled: !!id,
  });

  // Fetch course info for display
  const { data: courses } = useQuery({
    queryKey: ['/api/courses'],
  });

  const course = courses?.find((c: any) => c.id === id);

  const [editedHoles, setEditedHoles] = useState<CourseHole[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize edited holes when data loads
  useState(() => {
    if (holes && holes.length === 18) {
      setEditedHoles([...holes]);
    } else if (holes && holes.length === 0) {
      // Create default 18 holes
      const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
        id: `temp-${i + 1}`,
        courseId: id!,
        hole: i + 1,
        par: 4,
        strokeIndex: i + 1,
      }));
      setEditedHoles(defaultHoles);
    }
  }, [holes, id]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (holesData: Omit<CourseHole, 'id' | 'courseId'>[]) =>
      apiRequest(`/api/courses/${id}/holes`, {
        method: 'PATCH',
        body: { holes: holesData },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'holes'] });
      setLocation('/courses');
    },
  });

  // Validation logic
  const validateHoles = (holes: CourseHole[]): string[] => {
    const errors: string[] = [];

    if (holes.length !== 18) {
      errors.push('Must have exactly 18 holes');
      return errors;
    }

    // Check hole numbers
    const holeNumbers = holes.map(h => h.hole).sort((a, b) => a - b);
    const expectedHoles = Array.from({ length: 18 }, (_, i) => i + 1);
    if (JSON.stringify(holeNumbers) !== JSON.stringify(expectedHoles)) {
      errors.push('Hole numbers must be exactly 1-18');
    }

    // Check stroke indexes
    const strokeIndexes = holes.map(h => h.strokeIndex).sort((a, b) => a - b);
    if (JSON.stringify(strokeIndexes) !== JSON.stringify(expectedHoles)) {
      errors.push('Stroke indexes must be a unique permutation of 1-18');
    }

    // Check par values
    const invalidPars = holes.filter(h => h.par < 3 || h.par > 6);
    if (invalidPars.length > 0) {
      errors.push('Par values must be between 3 and 6');
    }

    return errors;
  };

  const handleHoleChange = (holeIndex: number, field: 'par' | 'strokeIndex', value: number) => {
    const newHoles = [...editedHoles];
    newHoles[holeIndex] = { ...newHoles[holeIndex], [field]: value };
    setEditedHoles(newHoles);

    // Validate on each change
    const errors = validateHoles(newHoles);
    setValidationErrors(errors);
  };

  const handleSave = () => {
    const errors = validateHoles(editedHoles);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const holesData = editedHoles.map(hole => ({
      hole: hole.hole,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
    }));

    updateMutation.mutate(holesData);
  };

  const isValid = validationErrors.length === 0 && editedHoles.length === 18;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading course holes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/courses')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Course Holes</h1>
          <p className="text-gray-600">{course?.name}</p>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert className="mb-6" data-testid="alert-validation-errors">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hole Configuration</CardTitle>
          <CardDescription>
            Set par values and stroke indexes for each hole. Stroke indexes should be a unique permutation of 1-18.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {editedHoles.map((hole, index) => (
              <div
                key={hole.hole}
                className="border rounded-lg p-4 space-y-3"
                data-testid={`hole-config-${hole.hole}`}
              >
                <h3 className="font-semibold text-center">Hole {hole.hole}</h3>
                
                <div className="space-y-2">
                  <Label htmlFor={`par-${hole.hole}`}>Par</Label>
                  <Select
                    value={hole.par.toString()}
                    onValueChange={(value) =>
                      handleHoleChange(index, 'par', parseInt(value))
                    }
                  >
                    <SelectTrigger data-testid={`select-par-${hole.hole}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`si-${hole.hole}`}>Stroke Index</Label>
                  <Select
                    value={hole.strokeIndex.toString()}
                    onValueChange={(value) =>
                      handleHoleChange(index, 'strokeIndex', parseInt(value))
                    }
                  >
                    <SelectTrigger data-testid={`select-strokeindex-${hole.hole}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setLocation('/courses')}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || updateMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}