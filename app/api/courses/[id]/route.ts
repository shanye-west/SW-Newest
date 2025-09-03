import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses, courseTees } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    if (!Array.isArray(data.tees) || data.tees.length === 0) {
      throw new Error('At least one tee is required');
    }
    const firstTee = data.tees[0];
    const [course] = await db
      .update(courses)
      .set({
        name: data.name,
        par: data.par,
        rating: firstTee.rating,
        slope: firstTee.slope,
      })
      .where(eq(courses.id, params.id))
      .returning();

    await db.delete(courseTees).where(eq(courseTees.courseId, params.id));
    const tees = await db
      .insert(courseTees)
      .values(
        data.tees.map((t: any) => ({
          id: nanoid(),
          courseId: params.id,
          name: t.name,
          rating: t.rating,
          slope: t.slope,
          yards: t.yards,
        }))
      )
      .returning();

    return NextResponse.json({ ...course, tees });
  } catch (error) {
    console.error('Failed to update course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      await db.delete(courses).where(eq(courses.id, params.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}