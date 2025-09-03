'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  par: number;
  rating: number;
  createdAt: Date;
}

interface CourseFormData {
  name: string;
  par: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    par: '',
    tees: [
    ]
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

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
    const courseData = {
      name: formData.name.trim(),
      par: parseInt(formData.par),
      tees: formData.tees.map(t => ({
        name: t.name.trim(),
      }))
    };

    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Course ${editingCourse ? 'updated' : 'created'} successfully`
        });
        resetForm();
        fetchCourses();
      } else {
        throw new Error('Failed to save course');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save course',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      par: course.par.toString(),
      tees: course.tees.map(t => ({
        name: t.name,
      }))
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Course deleted successfully'
        });
        fetchCourses();
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      par: '',
    });
    setEditingCourse(null);
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Golf Courses</h1>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-add-course"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Course
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCourse ? 'Edit Course' : 'Add New Course'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-course-name"
                />
              </div>
              <div>
                <Label htmlFor="par">Par *</Label>
                <Input
                  id="par"
                  type="number"
                  min="60"
                  max="80"
                  value={formData.par}
                  onChange={(e) => setFormData({ ...formData, par: e.target.value })}
                  required
                  data-testid="input-course-par"
                />
              </div>
              <div className="space-y-4">
                {formData.tees.map((tee, index) => (
                    <div>
                      <Label>Tee Name *</Label>
                      <Input
                        value={tee.name}
                        onChange={(e) => {
                          const tees = [...formData.tees];
                          tees[index].name = e.target.value;
                          setFormData({ ...formData, tees });
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Slope *</Label>
                      <Input
                        type="number"
                        min="55"
                        max="155"
                        value={tee.slope}
                        onChange={(e) => {
                          const tees = [...formData.tees];
                          tees[index].slope = e.target.value;
                          setFormData({ ...formData, tees });
                        }}
                        required
                        data-testid={`input-tee-slope-${index}`}
                      />
                    </div>
                    <div>
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                >
                  Add Tee
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-course"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  data-testid="button-cancel-course"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} data-testid={`course-card-${course.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg" data-testid={`course-name-${course.id}`}>
                  {course.name}
                </h3>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(course)}
                    data-testid={`button-edit-course-${course.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(course.id)}
                    data-testid={`button-delete-course-${course.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
                <div>
                  <span className="font-medium">Par:</span>
                  <p data-testid={`course-par-${course.id}`}>{course.par}</p>
                </div>
                <div>
                  <span className="font-medium">Tee:</span>
                  <p>{course.tees[0]?.name || 'Default'}</p>
                </div>
                <div>
                  <span className="font-medium">Rating:</span>
                  <p data-testid={`course-rating-${course.id}`}>{course.tees[0]?.rating ?? course.rating}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Added: {new Date(course.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">No courses added yet. Click "Add Course" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}