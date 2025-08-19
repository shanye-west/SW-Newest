import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        course: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(tournaments);
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
    
    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        date: data.date,
        courseId: data.courseId,
        holes: 18, // Fixed to 18 holes per requirements
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
    
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Failed to create tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}