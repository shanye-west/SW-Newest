import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const group = await prisma.group.update({
      where: { id: params.id },
      data: {
        name: data.name,
        tournamentId: data.tournamentId,
        teeTime: data.teeTime ? new Date(data.teeTime) : null,
      },
      include: {
        tournament: {
          include: {
            course: true
          }
        }
      }
    });
    
    return NextResponse.json(group);
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
    await prisma.group.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}