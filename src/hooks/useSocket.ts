"use client"

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io server')
      setIsConnected(true)
      
      // Authenticate user if logged in
      if (session?.user) {
        const userIdentifier = session.user.email || session.user.id
        socketInstance.emit('authenticate', userIdentifier)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.io server')
      setIsConnected(false)
    })

    socketInstance.on('error', (error) => {
      console.error('Socket.io error:', error)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [session?.user?.email])

  return { socket, isConnected }
}

interface RoomData {
  id: string
  name: string
  blackPlayer?: { id: string; name: string; email: string; image?: string }
  whitePlayer?: { id: string; name: string; email: string; image?: string }
  board: (string | null)[][]
  currentPlayer: string
  winner?: string
  isGameOver: boolean
  moveHistory: { row: number; col: number; player: string }[]
  status: string
  createdAt: string
  updatedAt: string
}

export function useGameSocket(roomId: string | null, userId: string | null) {
  const { socket, isConnected } = useSocket()
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!socket || !roomId || !userId || !isConnected) {
      return
    }

    // Join the room
    socket.emit('join-room', roomId, userId)

    // Listen for room updates
    const handleRoomUpdated = (data: { room: RoomData }) => {
      setRoomData(data.room)
      setError(null)
    }

    const handleGameUpdated = (data: { room: RoomData }) => {
      setRoomData(data.room)
      setError(null)
    }

    const handleError = (errorMsg: string) => {
      setError(errorMsg)
    }

    socket.on('room-updated', handleRoomUpdated)
    socket.on('game-updated', handleGameUpdated)
    socket.on('error', handleError)

    return () => {
      socket.off('room-updated', handleRoomUpdated)
      socket.off('game-updated', handleGameUpdated)
      socket.off('error', handleError)
      socket.emit('leave-room', roomId)
    }
  }, [socket, roomId, userId, isConnected])

  const makeMove = (row: number, col: number) => {
    if (socket && roomId && userId) {
      socket.emit('make-move', { roomId, row, col, userId })
    }
  }

  return {
    roomData,
    error,
    makeMove,
    isConnected
  }
}

export function useOnlineUsers() {
  const { socket, isConnected } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([])
  const onInvitationAcceptedRef = useRef<((roomId: string) => void) | null>(null)

  useEffect(() => {
    if (!socket || !isConnected) return

    // Listen for online users updates
    const handleOnlineUsersUpdated = (users: OnlineUser[]) => {
      setOnlineUsers(users)
    }

    // Listen for game invitations
    const handleGameInvitation = (invitation: GameInvitation) => {
      setGameInvitations(prev => [invitation, ...prev])
    }

    const handleInvitationAccepted = (data: { invitationId: string; roomId: string }) => {
      setGameInvitations(prev => prev.filter(inv => inv.id !== data.invitationId))
      // Notify the parent component that invitation was accepted
      if (onInvitationAcceptedRef.current) {
        onInvitationAcceptedRef.current(data.roomId)
      }
    }

    const handleInvitationDeclined = (data: { invitationId: string }) => {
      setGameInvitations(prev => prev.filter(inv => inv.id !== data.invitationId))
    }

    const handleInvitationCancelled = (data: { invitationId: string }) => {
      setGameInvitations(prev => prev.filter(inv => inv.id !== data.invitationId))
    }

    socket.on('online-users-updated', handleOnlineUsersUpdated)
    socket.on('game-invitation', handleGameInvitation)
    socket.on('invitation-accepted', handleInvitationAccepted)
    socket.on('invitation-declined', handleInvitationDeclined)
    socket.on('invitation-cancelled', handleInvitationCancelled)

    // Request initial data
    socket.emit('request-online-users')

    return () => {
      socket.off('online-users-updated', handleOnlineUsersUpdated)
      socket.off('game-invitation', handleGameInvitation)
      socket.off('invitation-accepted', handleInvitationAccepted)
      socket.off('invitation-declined', handleInvitationDeclined)
      socket.off('invitation-cancelled', handleInvitationCancelled)
    }
  }, [socket, isConnected])

  const sendGameInvitation = async (toUserEmail: string) => {
    if (!socket) throw new Error('Not connected')
    
    return new Promise<void>((resolve, reject) => {
      socket.emit('send-game-invitation', { toUserEmail }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve()
        } else {
          reject(new Error(response.error))
        }
      })
    })
  }

  const acceptInvitation = async (invitationId: string) => {
    if (!socket) throw new Error('Not connected')
    
    return new Promise<string>((resolve, reject) => {
      socket.emit('accept-invitation', { invitationId }, (response: { success: boolean; roomId?: string; error?: string }) => {
        if (response.success) {
          setGameInvitations(prev => prev.filter(inv => inv.id !== invitationId))
          resolve(response.roomId!)
        } else {
          reject(new Error(response.error))
        }
      })
    })
  }

  const declineInvitation = async (invitationId: string) => {
    if (!socket) throw new Error('Not connected')
    
    return new Promise<void>((resolve, reject) => {
      socket.emit('decline-invitation', { invitationId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          setGameInvitations(prev => prev.filter(inv => inv.id !== invitationId))
          resolve()
        } else {
          reject(new Error(response.error))
        }
      })
    })
  }

  const setOnInvitationAccepted = (callback: ((roomId: string) => void) | null) => {
    onInvitationAcceptedRef.current = callback
  }

  return {
    onlineUsers,
    gameInvitations,
    isConnected,
    sendGameInvitation,
    acceptInvitation,
    declineInvitation,
    setOnInvitationAccepted
  }
}

interface OnlineUser {
  email: string
  name: string
  image?: string
  status: 'available' | 'playing' | 'away'
}

interface GameInvitation {
  id: string
  fromUser: {
    email: string
    name: string
    image?: string
  }
  toUser: {
    email: string
    name: string
    image?: string
  }
  createdAt: string
  status: 'pending'
}