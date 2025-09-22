"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Board } from "@/components/game/board"
import { useGameSocket } from "@/hooks/useSocket"
import { Player, CellState } from "@/types/game"
import Image from "next/image"

interface GamePageProps {
  params: Promise<{
    roomId: string
  }>
}

export default function GamePage({ params }: GamePageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [playerColor, setPlayerColor] = useState<Player | null>(null)
  const [isSpectator, setIsSpectator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [roomId, setRoomId] = useState<string | null>(null)

  // Extract roomId from async params
  useEffect(() => {
    const extractRoomId = async () => {
      const resolvedParams = await params
      setRoomId(resolvedParams.roomId)
    }
    extractRoomId()
  }, [params])

  // Use Socket.io for real-time game updates
  const { roomData, error, makeMove, isConnected } = useGameSocket(
    roomId,
    session?.user?.email || null
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    if (!session?.user) {
      return
    }

    // Join the room first via API
    const joinRoom = async () => {
      if (!roomId) {
        setIsLoading(false)
        return
      }
      
      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          method: 'POST',
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to join room:', errorData.error)
          // Still continue to show the game, user might be spectating
        }
      } catch (error) {
        console.error('Error joining room:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (roomId) {
      joinRoom()
    } else {
      setIsLoading(false)
    }
  }, [session, status, roomId, router])

  useEffect(() => {
    if (roomData && session?.user?.email) {
      const userId = session.user.email
      
      // Determine player role
      if (roomData.blackPlayer?.email === userId) {
        setPlayerColor('black')
        setIsSpectator(false)
      } else if (roomData.whitePlayer?.email === userId) {
        setPlayerColor('white')
        setIsSpectator(false)
      } else {
        setIsSpectator(true)
        setPlayerColor(null)
      }
    }
  }, [roomData, session])

  const handleCellClick = (row: number, col: number) => {
    // Don't allow moves if not both players are present
    if (!roomData || !roomData.blackPlayer || !roomData.whitePlayer) return
    if (!playerColor || isSpectator) return
    if (roomData.currentPlayer !== playerColor) return
    if (roomData.status !== 'PLAYING') return
    if (roomData.isGameOver || roomData.board[row][col] !== null) return

    makeMove(row, col)
  }

  const leaveRoom = () => {
    router.push('/lobby')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) return null
  
  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Invalid Room</div>
          <button
            onClick={() => router.push('/lobby')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }
  
  if (isLoading || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading game...</div>
          {!isConnected && <div className="text-sm text-gray-600">Connecting to server...</div>}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => router.push('/lobby')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  const isMyTurn = playerColor === roomData.currentPlayer
  const gameReady = roomData.blackPlayer && roomData.whitePlayer && roomData.status === 'PLAYING'
  const canPlay = playerColor && !isSpectator && !roomData.isGameOver && gameReady

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">{roomData.name}</h1>
            {isSpectator && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Spectating
              </span>
            )}
            {!isConnected && (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Disconnected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={leaveRoom}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Players Info */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-8">
            {/* Black Player */}
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${
              roomData.currentPlayer === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-100'
            }`}>
              <div className="w-6 h-6 bg-black rounded-full"></div>
              {roomData.blackPlayer ? (
                <div className="flex items-center space-x-2">
                  {roomData.blackPlayer.image && (
                    <Image
                      src={roomData.blackPlayer.image}
                      alt="Black player"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{roomData.blackPlayer.name}</div>
                    <div className="text-sm opacity-75">Black</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm">Waiting for player...</div>
              )}
            </div>

            <span className="text-gray-400 font-bold">VS</span>

            {/* White Player */}
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${
              roomData.currentPlayer === 'white' ? 'bg-gray-800 text-white' : 'bg-gray-100'
            }`}>
              <div className="w-6 h-6 bg-white border-2 border-gray-400 rounded-full"></div>
              {roomData.whitePlayer ? (
                <div className="flex items-center space-x-2">
                  {roomData.whitePlayer.image && (
                    <Image
                      src={roomData.whitePlayer.image}
                      alt="White player"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{roomData.whitePlayer.name}</div>
                    <div className="text-sm opacity-75">White</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm">Waiting for player...</div>
              )}
            </div>
          </div>
        </div>

        {/* Game Status Indicator */}
        {!gameReady ? (
          <div className="text-center mb-6">
            <div className="inline-block bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-yellow-600 rounded-full animate-spin border-t-transparent"></div>
                <span className="font-semibold">
                  Waiting for {!roomData.blackPlayer ? 'black' : 'white'} player to join...
                </span>
              </div>
            </div>
          </div>
        ) : !roomData.isGameOver ? (
          <div className="text-center mb-4">
            {isSpectator ? (
              <div className="text-lg font-semibold text-gray-700">
                {roomData.currentPlayer === 'black' ? 'Black' : 'White'}&apos;s turn
              </div>
            ) : isMyTurn ? (
              <div className="text-lg font-semibold text-green-600">
                Your turn!
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-600">
                Waiting for opponent...
              </div>
            )}
          </div>
        ) : null}

        {/* Game Status */}
        {roomData.winner && (
          <div className="text-center mb-6">
            <div className="inline-block bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${
                  roomData.winner === 'black' ? 'bg-black' : 'bg-white border-2 border-gray-400'
                }`}></div>
                <span className="font-semibold">
                  {roomData.winner === 'black' ? 'Black' : 'White'} wins!
                  {!isSpectator && playerColor === roomData.winner && ' You won!'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="flex justify-center">
          <div className={gameReady ? '' : 'opacity-50 pointer-events-none'}>
            <Board
              board={roomData.board as CellState[][]}
              onCellClick={handleCellClick}
              currentPlayer={roomData.currentPlayer as Player}
              disabled={!canPlay || !isMyTurn}
            />
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-8 text-center text-gray-600">
          <p>Moves: {roomData.moveHistory.length}</p>
          {playerColor && (
            <p className="text-sm mt-1">
              You are playing as {playerColor === 'black' ? 'Black' : 'White'}
            </p>
          )}
          {!gameReady && !isSpectator && (
            <p className="text-sm mt-2 text-yellow-600 font-medium">
              Share this room link with a friend to start playing!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}