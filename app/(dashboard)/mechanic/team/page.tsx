import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { TeamRoster } from './TeamRoster'

export default async function MechanicTeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const isAdmin = session.user.workshopRole === 'ADMIN'

  const [mechanics, pendingInvites, userImage] = await Promise.all([
    prisma.user.findMany({
      where: { workshopId: session.user.workshopId },
      select: { id: true, name: true, email: true, workshopRole: true },
      orderBy: { createdAt: 'asc' },
    }),
    isAdmin
      ? prisma.workshopInvite.findMany({
          where: { workshopId: session.user.workshopId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, createdAt: true, expiresAt: true },
        })
      : Promise.resolve([]),
    getUserImage(session.user.id),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="team"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[900px]">
          <TeamRoster
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            mechanics={mechanics.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.workshopRole! }))}
            pendingInvites={pendingInvites.map(i => ({
              id: i.id,
              email: i.email,
              createdAt: i.createdAt.toISOString(),
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
