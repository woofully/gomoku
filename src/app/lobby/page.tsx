"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOnlineUsers } from "@/hooks/useSocket"
import Image from "next/image"

export default function Lobby() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [sendingInvitations, setSendingInvitations] = useState<Set<string>>(new Set())

  // Use Socket.io for online users and invitations
  const { 
    onlineUsers, 
    gameInvitations, 
    isConnected,
    sendGameInvitation, 
    acceptInvitation, 
    declineInvitation,
    setOnInvitationAccepted
  } = useOnlineUsers()

  // Handle when someone accepts our invitation
  useEffect(() => {
    setOnInvitationAccepted((roomId: string) => {
      setPendingNavigation(roomId)
    })
  }, [setOnInvitationAccepted])

  // Handle navigation outside of render
  useEffect(() => {
    if (pendingNavigation) {
      router.push(`/game/${pendingNavigation}`)
      setPendingNavigation(null)
    }
  }, [pendingNavigation, router])

  const handleInviteUser = async (userEmail: string) => {
    if (sendingInvitations.has(userEmail)) return // Prevent double-clicking
    
    try {
      setError(null)
      setSendingInvitations(prev => new Set(prev).add(userEmail))
      await sendGameInvitation(userEmail)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setSendingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(userEmail)
        return newSet
      })
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setError(null)
      const roomId = await acceptInvitation(invitationId)
      router.push(`/game/${roomId}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept invitation')
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setError(null)
      await declineInvitation(invitationId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to decline invitation')
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const currentUserEmail = session.user?.email
  const otherUsers = onlineUsers.filter(user => user.email !== currentUserEmail)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">Game Lobby</h1>
            {!isConnected && (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Disconnected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              {otherUsers.length} player{otherUsers.length !== 1 ? 's' : ''} online
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Game Invitations */}
        {gameInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Game Invitations</h2>
            <div className="space-y-3">
              {gameInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {invitation.fromUser.image && (
                        <Image
                          src={invitation.fromUser.image}
                          alt={invitation.fromUser.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {invitation.fromUser.name} invited you to play
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(invitation.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Users */}
        <div className="grid gap-4">
          {!isConnected ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Connecting...</div>
            </div>
          ) : otherUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No other players online</p>
              <p className="text-gray-500">Share this app with friends to play together!</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Online Players</h2>
              {otherUsers.map((user) => (
                <div
                  key={user.email}
                  className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {user.image && (
                        <Image
                          src={user.image}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">
                          {user.status === 'available' ? '🟢 Available' : 
                           user.status === 'playing' ? '🔴 In game' : '🟡 Away'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {user.status === 'available' ? (
                        <button
                          onClick={() => handleInviteUser(user.email)}
                          disabled={sendingInvitations.has(user.email)}
                          className={`px-6 py-2 rounded-lg transition-colors ${
                            sendingInvitations.has(user.email)
                              ? 'bg-blue-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {sendingInvitations.has(user.email) ? 'Sending...' : 'Invite to Play'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed"
                        >
                          {user.status === 'playing' ? 'In Game' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}