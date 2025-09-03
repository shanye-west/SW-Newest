import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tournaments, courses, courseTees } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
      const rows = await db
        .select({ tournament: tournaments, course: courses, tee: courseTees })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .leftJoin(courseTees, eq(courseTees.courseId, courses.id))
        .orderBy(desc(tournaments.createdAt));

      const map = new Map<string, any>();
      for (const row of rows) {
        const t = row.tournament;
        if (!map.has(t.id)) {
          map.set(t.id, { ...t, course: { ...row.course, tees: [] } });
        }
        if (row.tee) {
          map.get(t.id).course.tees.push(row.tee);
        }
      }

      return NextResponse.json(Array.from(map.values()));
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

      const courseRows = await db
        .select()
        .from(courses)
        .where(eq(courses.id, tournament.courseId));
      const tees = await db
        .select()
        .from(courseTees)
        .where(eq(courseTees.courseId, tournament.courseId));

      return NextResponse.json({ ...tournament, course: { ...courseRows[0], tees } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}