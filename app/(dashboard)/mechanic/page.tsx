import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { WORKSHOP_SPECIALTY_LABELS } from '@/lib/workshopSpecialty'
import { MECHANIC_NAV_ITEMS } from './nav-items'
import { MechanicPanel } from './MechanicPanel'

export default async function MechanicDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const [workshop, userImage] = await Promise.all([
    prisma.workshop.findUnique({
      where: { id: session.user.workshopId },
      include: { hours: true },
    }),
    getUserImage(session.user.id),
  ])
  if (!workshop) redirect('/workshop/setup')

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="panel"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <MechanicPanel
        workshopName={workshop.name}
        address={workshop.address}
        phone={workshop.phone}
        specialtyLabels={workshop.specialties.map(
          s => WORKSHOP_SPECIALTY_LABELS[s as keyof typeof WORKSHOP_SPECIALTY_LABELS] ?? s
        )}
        hoursConfiguredDays={workshop.hours.length}
        slotDurationMinutes={workshop.slotDurationMinutes}
        hasLocation={workshop.latitude !== null && workshop.longitude !== null}
      />
      <DashboardFooter />
    </div>
  )
}
