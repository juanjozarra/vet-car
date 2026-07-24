import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const normalizedEmail = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (!user?.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        // Return only what the token needs. NEVER include `image`: it holds a
        // data-URL avatar that NextAuth would map to the JWT `picture` claim,
        // bloating the session cookie past the header limit (431 errors).
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workshopId: user.workshopId,
          workshopRole: user.workshopRole,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Never carry the avatar in the JWT — a data-URL image would blow the
      // session cookie past the server header limit. It's read from the DB
      // where it's displayed instead.
      delete token.picture
      if (user) {
        token.id = user.id
        token.role = user.role
        token.workshopId = user.workshopId ?? null
        token.workshopRole = user.workshopRole ?? null
      }
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id } })
        if (dbUser) {
          token.workshopId = dbUser.workshopId ?? null
          token.workshopRole = dbUser.workshopRole ?? null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.workshopId = token.workshopId ?? null
        session.user.workshopRole = token.workshopRole ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
