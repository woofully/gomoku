const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

// Load environment variables
require('dotenv').config()

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Initialize Prisma
const prisma = new PrismaClient()

// Track online users and invitations
const onlineUsers = new Map() // email -> { socketId, userInfo, status }
const gameInvitations = new Map() // invitationId -> invitation data

// Game logic functions
function createEmptyBoard(size = 15) {
  return Array(size).fill(null).map(() => Array(size).fill(null))
}

function checkWinner(board, row, col, player) {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ]

  for (const [dx, dy] of directions) {
    let count = 1 // count the current piece

    // Check in positive direction
    let r = row + dx
    let c = col + dy
    while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
      count++
      r += dx
      c += dy
    }

    // Check in negative direction
    r = row - dx
    c = col - dy
    while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
      count++
      r -= dx
      c -= dy
    }

    if (count >= 5) {
      return true
    }
  }

  return false
}

function makeMove(gameState, row, col) {
  // Check if move is valid
  if (gameState.isGameOver || gameState.board[row][col] !== null) {
    return gameState
  }

  // Create new board with the move
  const newBoard = gameState.board.map(r => [...r])
  newBoard[row][col] = gameState.currentPlayer

  // Check for winner
  const winner = checkWinner(newBoard, row, col, gameState.currentPlayer) 
    ? gameState.currentPlayer 
    : null

  // Check for draw (board full)
  const isBoardFull = newBoard.every(row => row.every(cell => cell !== null))
  const isGameOver = winner !== null || isBoardFull

  return {
    board: newBoard,
    currentPlayer: gameState.currentPlayer === 'black' ? 'white' : 'black',
    winner,
    isGameOver,
    moveHistory: [
      ...gameState.moveHistory,
      { row, col, player: gameState.currentPlayer }
    ]
  }
}

// Clean up rooms that have been abandoned
async function cleanupEmptyRooms() {
  try {
    // Delete rooms that are in WAITING state and have no active connections
    // or rooms that have been inactive for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const abandonedRooms = await prisma.gameRoom.deleteMany({
      where: {
        OR: [
          {
            AND: [
              { status: 'WAITING' },
              { updatedAt: { lt: oneHourAgo } }
            ]
          },
          {
            AND: [
              { status: 'PLAYING' },
              { updatedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } } // 2 hours for active games
            ]
          }
        ]
      }
    })
    
    if (abandonedRooms.count > 0) {
      console.log(`Cleaned up ${abandonedRooms.count} abandoned rooms`)
    }
  } catch (error) {
    console.error('Error in cleanupEmptyRooms:', error)
  }
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const { pathname } = parsedUrl
      
      // Handle API routes through Next.js
      if (pathname.startsWith('/api/')) {
        await handle(req, res, parsedUrl)
        return
      }
      
      // Handle all other routes through Next.js
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Handle user authentication and online status
    socket.on('authenticate', async (userIdentifier) => {
      if (!userIdentifier) return
      
      try {
        // Get user info from database - try email first, then by ID
        let user = await prisma.user.findUnique({
          where: { email: userIdentifier }
        })
        
        // If not found by email, try by ID (for WeChat users)
        if (!user) {
          user = await prisma.user.findUnique({
            where: { id: userIdentifier }
          })
        }
        
        if (user) {
          const userKey = user.email || user.id
          // Add to online users
          onlineUsers.set(userKey, {
            socketId: socket.id,
            userInfo: { 
              email: user.email || `${user.id}@wechat.local`, 
              name: user.name, 
              image: user.image 
            },
            status: 'available'
          })
          
          // Broadcast updated online users list
          broadcastOnlineUsers()
          
          console.log(`User ${userKey} is now online`)
        }
      } catch (error) {
        console.error('Error authenticating user:', error)
      }
    })

    // Request online users
    socket.on('request-online-users', () => {
      broadcastOnlineUsers()
    })

    // Send game invitation
    socket.on('send-game-invitation', async (data, callback) => {
      try {
        const { toUserEmail } = data
        const fromUserData = findUserBySocketId(socket.id)
        
        if (!fromUserData) {
          callback({ success: false, error: 'Not authenticated' })
          return
        }

        const toUserData = onlineUsers.get(toUserEmail)
        if (!toUserData) {
          callback({ success: false, error: 'User is not online' })
          return
        }

        if (toUserData.status !== 'available') {
          callback({ success: false, error: 'User is not available' })
          return
        }

        // Check for existing invitation from the same user to the same user
        const existingInvitation = Array.from(gameInvitations.values()).find(
          inv => inv.fromUser.email === fromUserData.userInfo.email && 
                 inv.toUser.email === toUserEmail &&
                 inv.status === 'pending'
        )

        if (existingInvitation) {
          callback({ success: false, error: 'Invitation already sent' })
          return
        }

        // Create invitation
        const invitationId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        const invitation = {
          id: invitationId,
          fromUser: fromUserData.userInfo,
          toUser: toUserData.userInfo,
          createdAt: new Date().toISOString(),
          status: 'pending'
        }

        gameInvitations.set(invitationId, invitation)

        // Send invitation to target user
        socket.to(toUserData.socketId).emit('game-invitation', invitation)

        callback({ success: true })
      } catch (error) {
        console.error('Error sending invitation:', error)
        callback({ success: false, error: 'Failed to send invitation' })
      }
    })

    // Accept game invitation
    socket.on('accept-invitation', async (data, callback) => {
      try {
        const { invitationId } = data
        const invitation = gameInvitations.get(invitationId)
        
        if (!invitation) {
          callback({ success: false, error: 'Invitation not found' })
          return
        }

        // Create a new game room
        const roomName = `${invitation.fromUser.name} vs ${invitation.toUser.name}`
        const room = await prisma.gameRoom.create({
          data: {
            name: roomName,
            blackPlayerId: (await prisma.user.findUnique({ where: { email: invitation.fromUser.email } }))?.id,
            whitePlayerId: (await prisma.user.findUnique({ where: { email: invitation.toUser.email } }))?.id,
            board: JSON.stringify(createEmptyBoard()),
            moveHistory: JSON.stringify([]),
            status: 'PLAYING'
          }
        })

        // Update user statuses
        const fromUserData = onlineUsers.get(invitation.fromUser.email)
        const toUserData = onlineUsers.get(invitation.toUser.email)
        
        if (fromUserData) fromUserData.status = 'playing'
        if (toUserData) toUserData.status = 'playing'

        // Clean up invitation
        gameInvitations.delete(invitationId)

        // Notify both users
        if (fromUserData) {
          socket.to(fromUserData.socketId).emit('invitation-accepted', { invitationId, roomId: room.id })
        }
        socket.emit('invitation-accepted', { invitationId, roomId: room.id })

        broadcastOnlineUsers()
        
        callback({ success: true, roomId: room.id })
      } catch (error) {
        console.error('Error accepting invitation:', error)
        callback({ success: false, error: 'Failed to accept invitation' })
      }
    })

    // Decline game invitation
    socket.on('decline-invitation', async (data, callback) => {
      try {
        const { invitationId } = data
        const invitation = gameInvitations.get(invitationId)
        
        if (!invitation) {
          callback({ success: false, error: 'Invitation not found' })
          return
        }

        // Clean up invitation
        gameInvitations.delete(invitationId)

        // Notify sender
        const fromUserData = onlineUsers.get(invitation.fromUser.email)
        if (fromUserData) {
          socket.to(fromUserData.socketId).emit('invitation-declined', { invitationId })
        }

        callback({ success: true })
      } catch (error) {
        console.error('Error declining invitation:', error)
        callback({ success: false, error: 'Failed to decline invitation' })
      }
    })

    // Join a game room
    socket.on('join-room', async (roomId, userId) => {
      try {
        socket.join(roomId)
        console.log(`User ${userId} joined room ${roomId}`)

        // Get current room state and broadcast to room
        const room = await prisma.gameRoom.findUnique({
          where: { id: roomId },
          include: {
            blackPlayer: true,
            whitePlayer: true
          }
        })

        if (room) {
          io.to(roomId).emit('room-updated', {
            room: {
              ...room,
              board: room.board ? JSON.parse(room.board) : createEmptyBoard(),
              moveHistory: room.moveHistory ? JSON.parse(room.moveHistory) : []
            }
          })
        }
      } catch (error) {
        console.error('Error joining room:', error)
        socket.emit('error', 'Failed to join room')
      }
    })

    // Handle game moves
    socket.on('make-move', async (data) => {
      try {
        const { roomId, row, col, userId } = data
        
        // Get current room state
        const room = await prisma.gameRoom.findUnique({
          where: { id: roomId },
          include: {
            blackPlayer: true,
            whitePlayer: true
          }
        })

        if (!room) {
          socket.emit('error', 'Room not found')
          return
        }

        // Check if both players are present
        if (!room.blackPlayer || !room.whitePlayer) {
          socket.emit('error', 'Waiting for another player to join')
          return
        }

        // Check if game can start (both players present)
        if (room.status !== 'PLAYING') {
          socket.emit('error', 'Game is not ready to start')
          return
        }

        // Check if it's the user's turn - userId is email, not database ID
        const isBlackPlayer = room.blackPlayer?.email === userId
        const isWhitePlayer = room.whitePlayer?.email === userId
        
        if (!isBlackPlayer && !isWhitePlayer) {
          socket.emit('error', 'You are not a player in this game')
          return
        }

        const playerColor = isBlackPlayer ? 'black' : 'white'
        if (room.currentPlayer !== playerColor) {
          socket.emit('error', 'Not your turn')
          return
        }

        if (room.isGameOver) {
          socket.emit('error', 'Game is already over')
          return
        }

        // Parse current game state
        const currentBoard = room.board ? JSON.parse(room.board) : createEmptyBoard()
        const currentMoveHistory = room.moveHistory ? JSON.parse(room.moveHistory) : []

        // Check if move is valid
        if (currentBoard[row][col] !== null) {
          socket.emit('error', 'Cell already occupied')
          return
        }

        // Create game state and make move
        const gameState = {
          board: currentBoard,
          currentPlayer: room.currentPlayer,
          winner: room.winner,
          isGameOver: room.isGameOver,
          moveHistory: currentMoveHistory
        }

        const newGameState = makeMove(gameState, row, col)

        // Update room in database
        const updatedRoom = await prisma.gameRoom.update({
          where: { id: roomId },
          data: {
            board: JSON.stringify(newGameState.board),
            currentPlayer: newGameState.currentPlayer,
            winner: newGameState.winner,
            isGameOver: newGameState.isGameOver,
            moveHistory: JSON.stringify(newGameState.moveHistory),
            moveCount: newGameState.moveHistory.length,
            status: newGameState.isGameOver ? 'FINISHED' : 'PLAYING',
            updatedAt: new Date()
          },
          include: {
            blackPlayer: true,
            whitePlayer: true
          }
        })

        // Update user statuses if game is finished
        if (newGameState.isGameOver) {
          const blackPlayerData = onlineUsers.get(updatedRoom.blackPlayer?.email)
          const whitePlayerData = onlineUsers.get(updatedRoom.whitePlayer?.email)
          
          if (blackPlayerData) blackPlayerData.status = 'available'
          if (whitePlayerData) whitePlayerData.status = 'available'
          
          broadcastOnlineUsers()
        }

        // Broadcast updated game state to all clients in the room
        io.to(roomId).emit('game-updated', {
          room: {
            ...updatedRoom,
            board: newGameState.board,
            moveHistory: newGameState.moveHistory
          }
        })

        // Broadcast to lobby for room list updates
        io.emit('lobby-updated')

      } catch (error) {
        console.error('Error making move:', error)
        socket.emit('error', 'Failed to make move')
      }
    })

    // Leave room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId)
      console.log(`Client ${socket.id} left room ${roomId}`)
    })

    // Request lobby update
    socket.on('request-lobby-update', () => {
      socket.emit('lobby-updated')
    })

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id)
      
      // Remove from online users
      const userEmail = findUserEmailBySocketId(socket.id)
      if (userEmail) {
        onlineUsers.delete(userEmail)
        
        // Clean up invitations involving this user
        const invitationsToRemove = []
        for (const [invitationId, invitation] of gameInvitations.entries()) {
          if (invitation.fromUser.email === userEmail || invitation.toUser.email === userEmail) {
            invitationsToRemove.push(invitationId)
          }
        }
        
        // Remove the invitations and notify other users
        for (const invitationId of invitationsToRemove) {
          const invitation = gameInvitations.get(invitationId)
          gameInvitations.delete(invitationId)
          
          // Notify the other user that the invitation was cancelled
          if (invitation) {
            const otherUserEmail = invitation.fromUser.email === userEmail 
              ? invitation.toUser.email 
              : invitation.fromUser.email
            const otherUserData = onlineUsers.get(otherUserEmail)
            if (otherUserData) {
              io.to(otherUserData.socketId).emit('invitation-cancelled', { invitationId })
            }
          }
        }
        
        broadcastOnlineUsers()
        console.log(`User ${userEmail} went offline`)
      }
      
      // Clean up empty rooms after a delay
      setTimeout(async () => {
        try {
          await cleanupEmptyRooms()
        } catch (error) {
          console.error('Error cleaning up rooms:', error)
        }
      }, 30000) // 30 second delay to allow reconnections
    })
  })

  // Helper functions for online users
  function findUserBySocketId(socketId) {
    for (const [email, userData] of onlineUsers.entries()) {
      if (userData.socketId === socketId) {
        return userData
      }
    }
    return null
  }

  function findUserEmailBySocketId(socketId) {
    for (const [email, userData] of onlineUsers.entries()) {
      if (userData.socketId === socketId) {
        return email
      }
    }
    return null
  }

  function broadcastOnlineUsers() {
    const usersList = Array.from(onlineUsers.values()).map(userData => ({
      ...userData.userInfo,
      status: userData.status
    }))
    io.emit('online-users-updated', usersList)
  }

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})