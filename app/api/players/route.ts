import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@shared/schema';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const allPlayers = await db
      .select()
      .from(players)
      .orderBy(desc(players.createdAt));

    return NextResponse.json(allPlayers);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
      const [player] = await db
        .insert(players)
        .values({
          id: nanoid(),
          name: data.name,
          email: data.email || null,
          handicapIndex: data.handicapIndex || null,
        })
        .returning();

      return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}