import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getWorkshopVehicles } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { VehicleSearchList } from './VehicleSearchList'

export default async function MechanicVehiclesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const [rawVehicles, userImage] = await Promise.all([
    getWorkshopVehicles(session.user.workshopId),
    getUserImage(session.user.id),
  ])

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
    plate: v.plate,
    vin: v.vin,
    ownerName: v.owner ? (v.owner.name ?? 'Sin nombre') : 'Sin dueño',
  }))

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
          <VehicleSearchList vehicles={vehicles} />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
