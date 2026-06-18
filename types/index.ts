import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    workshopId: string | null
  }

  interface Session {
    user: {
      id: string
      role: Role
      workshopId: string | null
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    workshopId: string | null
  }
}
