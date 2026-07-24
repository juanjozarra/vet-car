import 'next-auth'
import { Role, WorkshopRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    workshopId: string | null
    workshopRole: WorkshopRole | null
  }

  interface Session {
    user: {
      id: string
      role: Role
      workshopId: string | null
      workshopRole: WorkshopRole | null
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
    workshopRole: WorkshopRole | null
  }
}
