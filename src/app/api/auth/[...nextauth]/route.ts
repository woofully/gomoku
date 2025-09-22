import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Define WeChat profile type
interface WeChatProfile {
  openid: string
  nickname: string
  headimgurl: string
  [key: string]: string | number | boolean | null | undefined
}

const authOptions = {
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
        async request({ params }: { params: { code: string } }) {
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
        async request({ tokens }: { tokens: { access_token: string; openid: string } }) {
          const response = await fetch(
            `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.access_token}&openid=${tokens.openid}&lang=en`
          );
          return await response.json();
        },
      },
      clientId: process.env.WECHAT_APP_ID!,
      clientSecret: process.env.WECHAT_APP_SECRET!,
      profile(profile: WeChatProfile) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, user }: { token: any; account: any; user: any }) {
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      if (user) {
        token.userId = user.id
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account, profile }: { user: any; account: any; profile: any }) {
      if (account?.provider === 'wechat') {
        // For WeChat, we use the openid as the unique identifier
        const wechatProfile = profile as WeChatProfile
        user.email = user.email || `${wechatProfile?.openid}@wechat.local`
        user.id = wechatProfile?.openid || user.id
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = (NextAuth as any)(authOptions)
export { handler as GET, handler as POST }