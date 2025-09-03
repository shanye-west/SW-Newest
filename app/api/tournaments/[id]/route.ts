import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tournaments, courses, courseTees } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
      const [tournament] = await db
        .update(tournaments)
        .set({
          name: data.name,
          date: data.date,
          courseId: data.courseId,
          netAllowance: data.netAllowance,
          passcode: data.passcode,
          potAmount: data.potAmount ?? null,
          participantsForSkins: data.participantsForSkins ?? null,
          skinsCarry: data.skinsCarry ?? false,
        })
        .where(eq(tournaments.id, params.id))
        .returning();

      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, tournament.courseId))
        .limit(1);

      return NextResponse.json({ ...tournament, course: course[0] });
  } catch (error) {
    console.error('Failed to update tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      await db.delete(tournaments).where(eq(tournaments.id, params.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      const rows = await db
        .select({ tournament: tournaments, course: courses })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .where(eq(tournaments.id, params.id));
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const tees = await db
        .select()
        .from(courseTees)
        .where(eq(courseTees.courseId, rows[0].course.id));
      return NextResponse.json({ ...rows[0].tournament, course: { ...rows[0].course, tees } });
  } catch (error) {
    console.error('Failed to fetch tournament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}