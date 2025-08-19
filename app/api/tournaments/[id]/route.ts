import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: {
        name: data.name,
        date: data.date,
        courseId: data.courseId,
        netAllowance: data.netAllowance,
        passcode: data.passcode,
        potAmount: data.potAmount || null,
        participantsForSkins: data.participantsForSkins || null,
        skinsCarry: data.skinsCarry || false,
      },
      include: {
        course: true
      }
    });
    
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Failed to update tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tournament.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}