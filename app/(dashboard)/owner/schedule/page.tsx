import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { ScheduleView } from './ScheduleView'

export default async function SchedulePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const [rawWorkshops, rawVehicles, userImage] = await Promise.all([
    prisma.workshop.findMany({ orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    getUserImage(session.user.id),
  ])

  const workshops = rawWorkshops.map(w => ({
    id: w.id,
    name: w.name,
    address: w.address,
    phone: w.phone,
    specialties: w.specialties as string[],
    latitude: w.latitude,
    longitude: w.longitude,
    distanceKm: null as number | null,
  }))

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        active="schedule"
      />
      <ScheduleView workshops={workshops} vehicles={vehicles} />
      <DashboardFooter />
    </div>
  )
}
