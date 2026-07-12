import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { WorkshopSettingsForm } from './WorkshopSettingsForm'

export default async function MechanicSettingsPage() {
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
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="settings"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px]">
          <WorkshopSettingsForm
            initialSpecialties={workshop.specialties}
            initialSlotDurationMinutes={workshop.slotDurationMinutes}
            initialAddress={workshop.address}
            initialLatitude={workshop.latitude}
            initialLongitude={workshop.longitude}
            initialGooglePlaceId={workshop.googlePlaceId}
            initialHours={workshop.hours.map(h => ({
              dayOfWeek: h.dayOfWeek,
              opensMinute: h.opensMinute,
              closesMinute: h.closesMinute,
            }))}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
