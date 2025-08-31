import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tournaments, courses } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
      const rows = await db
        .select({ tournament: tournaments, course: courses })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .orderBy(desc(tournaments.createdAt));

      const data = rows.map(r => ({ ...r.tournament, course: r.course }));

      return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
      const [tournament] = await db
        .insert(tournaments)
        .values({
          id: nanoid(),
          name: data.name,
          date: data.date,
          courseId: data.courseId,
          holes: 18,
          netAllowance: data.netAllowance,
          passcode: data.passcode,
          potAmount: data.potAmount ?? null,
          participantsForSkins: data.participantsForSkins ?? null,
          skinsCarry: data.skinsCarry ?? false,
        })
        .returning();

      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, tournament.courseId))
        .limit(1);

      return NextResponse.json({ ...tournament, course: course[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}