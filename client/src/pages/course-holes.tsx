import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, RotateCcw, Shuffle, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { isPermutation1to18 } from '../../../shared/handicapNet';

interface CourseHole {
  id?: string;
  hole: number;
  par: number;
  strokeIndex: number;
}

interface Course {
  id: string;
  name: string;
}

const DEFAULT_PARS = [4,4,4,3,4,4,5,3,4, 4,4,3,4,5,4,4,3,4];

export default function CourseHoles() {
  const [match, params] = useRoute('/courses/:id/holes');
  const [, setLocation] = useLocation();
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Fetch course info
  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['/api/courses', params?.id],
    enabled: !!params?.id,
  });

  // Fetch existing holes
  const { data: holesData, isLoading: holesLoading, refetch } = useQuery<{ holes: CourseHole[] }>({
    queryKey: ['/api/courses', params?.id, 'holes'],
    enabled: !!params?.id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { holes: CourseHole[] }) => {
      const response = await fetch(`/api/courses/${params?.id}/holes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update course holes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course holes updated successfully",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update course holes",
        variant: "destructive",
      });
    },
  });

  // Initialize holes when data loads
  useEffect(() => {
    if (holesData?.holes && holesData.holes.length > 0) {
      setHoles(holesData.holes);
    } else if (!holesLoading && params?.id) {
      // Initialize with defaults if no holes exist or empty array
      const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        par: 4, // All par 4 as requested
        strokeIndex: i + 1, // Stroke index matches hole number
      }));
      setHoles(defaultHoles);
      setHasChanges(true); // Mark as having changes so user can save defaults
    }
  }, [holesData, holesLoading, params?.id]);

  const updateHole = (holeNum: number, field: 'par' | 'strokeIndex', value: number) => {
    setHoles(prev => prev.map(h => 
      h.hole === holeNum ? { ...h, [field]: value } : h
    ));
    setHasChanges(true);
  };

  const autofillPar = () => {
    setHoles(prev => prev.map(h => ({
      ...h,
      par: 4 // Set all holes to par 4
    })));
    setHasChanges(true);
  };

  const autofillSI = () => {
    setHoles(prev => prev.map(h => ({
      ...h,
      strokeIndex: h.hole
    })));
    setHasChanges(true);
  };

  const reset = () => {
    if (holesData?.holes && holesData.holes.length > 0) {
      setHoles(holesData.holes);
      setHasChanges(false);
    } else {
      const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        par: 4, // All par 4 as requested
        strokeIndex: i + 1, // Stroke index matches hole number
      }));
      setHoles(defaultHoles);
      setHasChanges(true); // Keep changes marked for new courses
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ holes });
  };

  // Validation
  const strokeIndexes = holes.map(h => h.strokeIndex);
  const isValidSI = isPermutation1to18(strokeIndexes);
  const hasInvalidPar = holes.some(h => h.par < 3 || h.par > 6);
  const canSave = isValidSI && !hasInvalidPar && hasChanges;

  if (!match) return null;

  if (courseLoading || holesLoading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading course holes...</div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/courses')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Course Holes</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {course?.name || 'Unknown Course'}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {!isValidSI && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Stroke Index must be a unique 1–18 set
            </span>
          </div>
        </div>
      )}

      {hasInvalidPar && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Par values must be between 3 and 6
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={autofillPar} data-testid="button-autofill-par">
          Autofill Par
        </Button>
        <Button variant="outline" size="sm" onClick={autofillSI} data-testid="button-autofill-si">
          <Shuffle className="w-4 h-4 mr-1" />
          Autofill SI 1–18
        </Button>
        <Button variant="outline" size="sm" onClick={reset} data-testid="button-reset">
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!canSave || updateMutation.isPending}
          data-testid="button-save"
        >
          <Save className="w-4 h-4 mr-1" />
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Holes Grid */}
      <Card>
        <CardHeader>
          <CardTitle>18 Holes Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Hole #</th>
                    <th className="text-left p-3 font-medium">Par</th>
                    <th className="text-left p-3 font-medium">Stroke Index</th>
                  </tr>
                </thead>
                <tbody>
                  {holes.map((hole, index) => (
                    <tr key={hole.hole} className="border-b">
                      <td className="p-3 font-medium">{hole.hole}</td>
                      <td className="p-3">
                        <Select 
                          value={hole.par.toString()}
                          onValueChange={(value) => updateHole(hole.hole, 'par', parseInt(value))}
                        >
                          <SelectTrigger className="w-20" data-testid={`par-select-${hole.hole}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="6">6</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Select 
                          value={hole.strokeIndex.toString()}
                          onValueChange={(value) => updateHole(hole.hole, 'strokeIndex', parseInt(value))}
                        >
                          <SelectTrigger className="w-20" data-testid={`si-select-${hole.hole}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 18 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3 p-4">
              {holes.map((hole) => (
                <div key={hole.hole} className="border rounded-lg p-3">
                  <div className="font-medium mb-2">Hole {hole.hole}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Par</label>
                      <Select 
                        value={hole.par.toString()}
                        onValueChange={(value) => updateHole(hole.hole, 'par', parseInt(value))}
                      >
                        <SelectTrigger data-testid={`par-select-${hole.hole}`}>
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
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">SI</label>
                      <Select 
                        value={hole.strokeIndex.toString()}
                        onValueChange={(value) => updateHole(hole.hole, 'strokeIndex', parseInt(value))}
                      >
                        <SelectTrigger data-testid={`si-select-${hole.hole}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 18 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}