import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses, courseTees } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const rows = await db
      .select({ course: courses, tee: courseTees })
      .from(courses)
      .leftJoin(courseTees, eq(courseTees.courseId, courses.id))
      .orderBy(desc(courses.createdAt));

    const map = new Map<string, any>();
    for (const row of rows) {
      const c = row.course;
      if (!map.has(c.id)) {
        map.set(c.id, { ...c, tees: [] });
      }
      if (row.tee) {
        map.get(c.id).tees.push(row.tee);
      }
    }

    return NextResponse.json(Array.from(map.values()));
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!Array.isArray(data.tees) || data.tees.length === 0) {
      throw new Error('At least one tee is required');
    }
    const firstTee = data.tees[0];
    const courseId = nanoid();
    const [course] = await db
      .insert(courses)
      .values({
        id: courseId,
        name: data.name,
        par: data.par,
        rating: firstTee.rating,
        slope: firstTee.slope,
      })
      .returning();

    const tees = await db
      .insert(courseTees)
      .values(
        data.tees.map((t: any) => ({
          id: nanoid(),
          courseId,
          name: t.name,
          rating: t.rating,
          slope: t.slope,
          yards: t.yards,
        }))
      )
      .returning();

    return NextResponse.json({ ...course, tees }, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}