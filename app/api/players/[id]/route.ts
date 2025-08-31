import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
      const [player] = await db
        .update(players)
        .set({
          name: data.name,
          email: data.email || null,
          handicapIndex: data.handicapIndex || null,
        })
        .where(eq(players.id, params.id))
        .returning();

      return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to update player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      await db.delete(players).where(eq(players.id, params.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}