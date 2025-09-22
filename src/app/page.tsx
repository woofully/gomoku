"use client"

import { useSession, signOut } from "next-auth/react"
import Image from "next/image"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-8">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-gray-900">Gomoku</h1>
          <p className="text-xl text-gray-600">Five in a row wins!</p>
          <div className="space-y-4">
            <a
              href="/auth/signin"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Sign In to Play
            </a>
            <div className="text-sm text-gray-500">
              Connect with Google or WeChat to start playing
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">Gomoku</h1>
            {session.user && (
              <div className="flex items-center space-x-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span className="text-gray-700">Welcome, {session.user.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="/lobby"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Join Game Lobby
            </a>
            <button
              onClick={() => signOut()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Game Info */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Play Gomoku?</h2>
            <p className="text-gray-600 mb-6">
              Gomoku is a strategic board game where you need to get 5 stones in a row to win. 
              Challenge your friends in real-time multiplayer matches!
            </p>
            <div className="space-y-4">
              <a
                href="/lobby"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Join Game Lobby
              </a>
              <div className="text-sm text-gray-500">
                Create or join a room to play with friends
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
