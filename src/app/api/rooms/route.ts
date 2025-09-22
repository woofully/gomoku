import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { createEmptyBoard } from '@/lib/game-logic'

// Import authOptions (we'll create a shared file)
const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
}

// GET /api/rooms - Get all rooms
export async function GET() {
  try {
    const rooms = await prisma.gameRoom.findMany({
      include: {
        blackPlayer: true,
        whitePlayer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const roomsWithParsedData = rooms.map(room => ({
      ...room,
      board: room.board ? JSON.parse(room.board) : createEmptyBoard(),
      moveHistory: room.moveHistory ? JSON.parse(room.moveHistory) : []
    }))

    return NextResponse.json(roomsWithParsedData)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image
        }
      })
    }

    // Create the room
    const room = await prisma.gameRoom.create({
      data: {
        name: name.trim(),
        blackPlayerId: user.id,
        board: JSON.stringify(createEmptyBoard()),
        moveHistory: JSON.stringify([]),
        status: 'WAITING'
      },
      include: {
        blackPlayer: true,
        whitePlayer: true
      }
    })

    const roomWithParsedData = {
      ...room,
      board: JSON.parse(room.board),
      moveHistory: JSON.parse(room.moveHistory)
    }

    return NextResponse.json(roomWithParsedData, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}