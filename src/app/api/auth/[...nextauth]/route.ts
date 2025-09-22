import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // WeChat provider
    {
      id: "wechat",
      name: "WeChat",
      type: "oauth",
      authorization: {
        url: "https://open.weixin.qq.com/connect/qrconnect",
        params: {
          appid: process.env.WECHAT_APP_ID,
          scope: "snsapi_login",
          response_type: "code",
          state: "STATE", // Add CSRF protection
        },
      },
      token: {
        url: "https://api.weixin.qq.com/sns/oauth2/access_token",
        async request({ client, params, checks, provider }) {
          const response = await fetch(
            `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}&code=${params.code}&grant_type=authorization_code`
          );
          const data = await response.json();
          return {
            tokens: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: Date.now() + data.expires_in * 1000,
              openid: data.openid,
            },
          };
        },
      },
      userinfo: {
        url: "https://api.weixin.qq.com/sns/userinfo",
        async request({ tokens }) {
          const response = await fetch(
            `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.access_token}&openid=${tokens.openid}&lang=en`
          );
          return await response.json();
        },
      },
      clientId: process.env.WECHAT_APP_ID!,
      clientSecret: process.env.WECHAT_APP_SECRET!,
      profile(profile) {
        return {
          id: profile.openid,
          name: profile.nickname || `WeChat User ${profile.openid.slice(-4)}`,
          email: `${profile.openid}@wechat.local`, // WeChat doesn't provide email
          image: profile.headimgurl,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        user: {
          ...session.user,
          id: token.userId,
          provider: token.provider,
        }
      }
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'wechat') {
        // For WeChat, we use the openid as the unique identifier
        user.email = user.email || `${profile?.openid}@wechat.local`
        user.id = profile?.openid || user.id
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})

export { handler as GET, handler as POST }