import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { createEmptyBoard } from '@/lib/game-logic'

// Import authOptions (we'll create a shared file)
const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
}

// GET /api/rooms/[roomId] - Get specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        blackPlayer: true,
        whitePlayer: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const roomWithParsedData = {
      ...room,
      board: room.board ? JSON.parse(room.board) : createEmptyBoard(),
      moveHistory: room.moveHistory ? JSON.parse(room.moveHistory) : []
    }

    return NextResponse.json(roomWithParsedData)
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

// POST /api/rooms/[roomId]/join - Join a room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get the room
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        blackPlayer: true,
        whitePlayer: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if user is already in the room
    if (room.blackPlayerId === user.id || room.whitePlayerId === user.id) {
      const roomWithParsedData = {
        ...room,
        board: room.board ? JSON.parse(room.board) : createEmptyBoard(),
        moveHistory: room.moveHistory ? JSON.parse(room.moveHistory) : []
      }
      return NextResponse.json(roomWithParsedData)
    }

    // Check if room is full
    if (room.blackPlayerId && room.whitePlayerId) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    }

    // Join as white player if black slot is taken
    let updatedRoom
    
    if (!room.whitePlayerId) {
      updatedRoom = await prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          whitePlayerId: user.id,
          status: room.blackPlayerId ? 'PLAYING' : 'WAITING'
        },
        include: {
          blackPlayer: true,
          whitePlayer: true
        }
      })
    } else if (!room.blackPlayerId) {
      updatedRoom = await prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          blackPlayerId: user.id,
          status: room.whitePlayerId ? 'PLAYING' : 'WAITING'
        },
        include: {
          blackPlayer: true,
          whitePlayer: true
        }
      })
    } else {
      // Room is full, just return the existing room data
      updatedRoom = await prisma.gameRoom.findUnique({
        where: { id: roomId },
        include: {
          blackPlayer: true,
          whitePlayer: true
        }
      })
    }

    if (!updatedRoom) {
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
    }

    const roomWithParsedData = {
      ...updatedRoom,
      board: updatedRoom.board ? JSON.parse(updatedRoom.board) : createEmptyBoard(),
      moveHistory: updatedRoom.moveHistory ? JSON.parse(updatedRoom.moveHistory) : []
    }

    return NextResponse.json(roomWithParsedData)
  } catch (error) {
    console.error('Error joining room:', error)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}