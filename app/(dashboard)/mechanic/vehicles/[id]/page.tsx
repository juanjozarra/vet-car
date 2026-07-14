// app/(dashboard)/mechanic/vehicles/[id]/page.tsx
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getVehicleWithHistory } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { VehicleHistoryTimeline } from '@/components/shared/VehicleHistoryTimeline'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { PlusIcon } from '@/components/ui/icons'
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
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {vehicle.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vehicle.photoUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/[0.08]"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="eyebrow">
                  <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                  Historial de servicio
                </span>
                <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                  {vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                </h1>
                {vehicle.plate && (
                  <span className="w-fit rounded-md bg-white/[0.06] px-2 py-1 font-mono text-xs uppercase tracking-[0.08em] text-foreground ring-1 ring-white/[0.1]">
                    {vehicle.plate}
                  </span>
                )}
              </div>
            </div>
            <Button asChild>
              <Link href={`/mechanic/vehicles/${vehicle.id}/history/new`}>
                Agregar registro
                <ButtonIconIsland>
                  <PlusIcon className="size-3.5" />
                </ButtonIconIsland>
              </Link>
            </Button>
          </div>
          <VehicleHistoryTimeline
            entries={vehicle.historyEntries}
            currentUserId={session.user.id}
            basePath={`/mechanic/vehicles/${vehicle.id}`}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
