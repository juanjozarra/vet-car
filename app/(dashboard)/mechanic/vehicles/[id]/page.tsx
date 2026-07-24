// app/(dashboard)/mechanic/vehicles/[id]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getVehicleWithHistory } from '@/lib/vehicleHistory'
import { VehicleDetailView } from '@/components/shared/VehicleDetailView'
import { MECHANIC_NAV_ITEMS } from '../../nav-items'

export default async function MechanicVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const { id } = await params
  const [vehicle, userImage] = await Promise.all([
    getVehicleWithHistory(session.user, id),
    getUserImage(session.user.id),
  ])
  if (!vehicle) notFound()

  return (
    <VehicleDetailView
      vehicle={vehicle}
      currentUserId={session.user.id}
      basePath={`/mechanic/vehicles/${vehicle.id}`}
      nav={{
        items: MECHANIC_NAV_ITEMS,
        active: 'vehicles',
        userName: session.user.name ?? 'mecánico',
        userEmail: session.user.email ?? undefined,
        userImage,
        profileHref: null,
      }}
    />
  )
}
