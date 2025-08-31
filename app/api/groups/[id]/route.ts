import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, tournaments, courses } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
      const [group] = await db
        .update(groups)
        .set({
          name: data.name,
          tournamentId: data.tournamentId,
          teeTime: data.teeTime ? new Date(data.teeTime) : null,
        })
        .where(eq(groups.id, params.id))
        .returning();

      const tournament = await db
        .select({ tournament: tournaments, course: courses })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .where(eq(tournaments.id, group.tournamentId))
        .limit(1);

      return NextResponse.json({
        ...group,
        tournament: { ...tournament[0].tournament, course: tournament[0].course }
      });
  } catch (error) {
    console.error('Failed to update group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      await db.delete(groups).where(eq(groups.id, params.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}