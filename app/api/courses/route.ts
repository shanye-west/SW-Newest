import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses } from '@shared/schema';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const allCourses = await db
      .select()
      .from(courses)
      .orderBy(desc(courses.createdAt));

    return NextResponse.json(allCourses);
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
    
      const [course] = await db
        .insert(courses)
        .values({
          id: nanoid(),
          name: data.name,
          par: data.par,
          slope: data.slope,
          rating: data.rating,
        })
        .returning();

      return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}