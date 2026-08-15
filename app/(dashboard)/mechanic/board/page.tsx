// app/(dashboard)/mechanic/board/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { boardWorkOrdersWhere, pendingArrivalAppointmentsWhere } from '@/lib/activeRepairs'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { Board } from './Board'

function vehicleLabel(vehicle: {
  nickname: string | null
  year: number
  make: string
  model: string
}) {
  return vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
}

export default async function MechanicBoardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const workshopId = session.user.workshopId

  const [appointments, workOrders, mechanics, userImage] = await Promise.all([
    prisma.appointment.findMany({
      where: pendingArrivalAppointmentsWhere(workshopId),
      include: { vehicle: { include: { owner: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: boardWorkOrdersWhere(workshopId),
      include: {
        vehicle: { select: { nickname: true, year: true, make: true, model: true, plate: true } },
        mechanic: { select: { id: true, name: true, email: true } },
        serviceItems: { select: { id: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { workshopId },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    }),
    getUserImage(session.user.id),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="board"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[1600px]">
          <Board
            scheduledAppointments={appointments.map(a => ({
              id: a.id,
              title: a.title,
              scheduledAt: a.scheduledAt.toISOString(),
              vehicleLabel: vehicleLabel(a.vehicle),
              ownerName: a.vehicle.owner?.name ?? 'Sin nombre',
            }))}
            tickets={workOrders.map(w => ({
              id: w.id,
              title: w.title,
              description: w.description,
              status: w.status,
              progressStage: w.progressStage,
              vehicleId: w.vehicleId,
              vehicleLabel: vehicleLabel(w.vehicle),
              vehiclePlate: w.vehicle.plate,
              mechanicId: w.mechanicId,
              mechanicName: w.mechanic.name ?? w.mechanic.email,
              serviceItems: w.serviceItems.map(s => ({ id: s.id, type: s.type })),
              createdAt: w.createdAt.toISOString(),
            }))}
            mechanics={mechanics}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
