import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../client/src/lib/db';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(players);
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
    
    const player = await prisma.player.create({
      data: {
        name: data.name,
        email: data.email || null,
        handicapIndex: data.handicapIndex || null,
      }
    });
    
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}