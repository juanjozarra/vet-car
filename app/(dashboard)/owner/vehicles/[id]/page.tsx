import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getVehicleWithHistory } from '@/lib/vehicleHistory'
import { VehicleDetailView } from '@/components/shared/VehicleDetailView'

export default async function OwnerVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

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
      basePath={`/owner/vehicles/${vehicle.id}`}
      nav={{
        userName: session.user.name ?? 'usuario',
        userEmail: session.user.email ?? undefined,
        userImage,
      }}
    />
  )
}
