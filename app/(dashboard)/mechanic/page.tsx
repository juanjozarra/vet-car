import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from './nav-items'

export default async function MechanicDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="panel"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-16 flex items-center justify-center">
        <h1 className="text-2xl font-semibold text-foreground font-mono">Panel del mecánico</h1>
      </main>
      <DashboardFooter />
    </div>
  )
}
