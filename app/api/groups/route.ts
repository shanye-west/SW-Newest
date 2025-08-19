import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        tournament: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(groups);
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
    
    const group = await prisma.group.create({
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
    
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}