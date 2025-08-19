import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../client/src/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const player = await prisma.player.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: data.email || null,
        handicapIndex: data.handicapIndex || null,
      }
    });
    
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
    await prisma.player.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}