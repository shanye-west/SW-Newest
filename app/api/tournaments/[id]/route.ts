import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tournaments, courses } from '@shared/schema';
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