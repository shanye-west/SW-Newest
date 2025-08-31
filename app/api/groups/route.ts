import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, tournaments, courses } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
      const rows = await db
        .select({ group: groups, tournament: tournaments, course: courses })
        .from(groups)
        .innerJoin(tournaments, eq(groups.tournamentId, tournaments.id))
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .orderBy(desc(groups.createdAt));

      const data = rows.map(r => ({
        ...r.group,
        tournament: { ...r.tournament, course: r.course }
      }));

      return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
      const [group] = await db
        .insert(groups)
        .values({
          id: nanoid(),
          name: data.name,
          tournamentId: data.tournamentId,
          teeTime: data.teeTime ? new Date(data.teeTime) : null,
        })
        .returning();

      const tournament = await db
        .select({ tournament: tournaments, course: courses })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .where(eq(tournaments.id, group.tournamentId))
        .limit(1);

      return NextResponse.json(
        {
          ...group,
          tournament: { ...tournament[0].tournament, course: tournament[0].course }
        },
        { status: 201 }
      );
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}