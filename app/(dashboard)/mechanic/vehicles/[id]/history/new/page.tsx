import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'
import { MECHANIC_NAV_ITEMS } from '../../../../nav-items'

export default async function MechanicNewHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const { id } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, id)
  if (!hasAccess) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px]">
          <HistoryEntryForm vehicleId={id} backHref={`/mechanic/vehicles/${id}`} mode="create" />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
