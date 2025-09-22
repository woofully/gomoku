import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      provider?: string
    }
    accessToken?: unknown
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }

  interface JWT {
    accessToken?: unknown
    provider?: string
    userId?: string
  }
}