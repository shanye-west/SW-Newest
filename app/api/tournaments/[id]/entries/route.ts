import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { entries, players, courseTees } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      const rows = await db
        .select({ entry: entries, player: players, tee: courseTees })
        .from(entries)
        .innerJoin(players, eq(entries.playerId, players.id))
        .leftJoin(courseTees, eq(entries.teeId, courseTees.id))
        .where(eq(entries.tournamentId, params.id));
      const data = rows.map(r => ({ ...r.entry, player: r.player, tee: r.tee }));
      return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
      const [entry] = await db
        .insert(entries)
        .values({
          id: nanoid(),
          tournamentId: params.id,
          playerId: data.playerId,
          teeId: data.teeId,
          courseHandicap: data.courseHandicap,
          playingCH: data.playingCH,
        })
        .returning();
      return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Failed to add entry:', error);
    return NextResponse.json(
      { error: 'Failed to add entry' },
      { status: 500 }
    );
  }
}
