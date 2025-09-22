"use client"

import { signIn, getProviders } from "next-auth/react"
import { useEffect, useState } from "react"

interface Provider {
  id: string
  name: string
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)

  useEffect(() => {
    (async () => {
      const res = await getProviders()
      setProviders(res)
    })()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Gomoku</h2>
          <p className="text-gray-600">Sign in to start playing five-in-a-row with friends</p>
        </div>
        
        <div className="space-y-4">
          {providers &&
            Object.values(providers).map((provider: Provider) => (
              <button
                key={provider.name}
                onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg transition-colors ${
                  provider.id === 'google'
                    ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {provider.id === 'google' && (
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {provider.id === 'wechat' && (
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.162 4.203 2.997 5.5l-.664 1.997 2.441-1.22c.664.111 1.329.222 1.996.222.443 0 .886-.037 1.329-.111-.111-.443-.222-.886-.222-1.329 0-3.664 3.109-6.657 6.995-6.657.332 0 .664.037.997.074C14.979 3.773 12.018 2.188 8.691 2.188zm-2.22 2.997c.554 0 .997.443.997.997s-.443.997-.997.997-.997-.443-.997-.997.443-.997.997-.997zm4.441 0c.554 0 .997.443.997.997s-.443.997-.997.997-.997-.443-.997-.997.443-.997.997-.997zm6.884.555c-3.553 0-6.441 2.665-6.441 5.994 0 3.329 2.888 5.994 6.441 5.994.555 0 1.109-.074 1.664-.185l1.775 1.109-.555-1.664C21.888 15.44 23 13.665 23 11.735c0-3.329-2.888-5.994-6.441-5.994zm-4.107 2.441c.443 0 .775.332.775.775s-.332.775-.775.775-.775-.332-.775-.775.332-.775.775-.775zm2.663 0c.443 0 .775.332.775.775s-.332.775-.775.775-.775-.332-.775-.775.332-.775.775-.775z"/>
                  </svg>
                )}
                Sign in with {provider.name}
              </button>
            ))
          }
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-black rounded-full"></div>
              <span>Black</span>
            </div>
            <span>vs</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white border border-gray-400 rounded-full"></div>
              <span>White</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}