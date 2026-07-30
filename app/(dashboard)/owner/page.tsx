import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { activeRepairsWhere } from '@/lib/activeRepairs'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { DashboardContent } from './DashboardContent'

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const userId = session.user.id

  const [rawVehicles, rawActiveRepairs, rawAppointments, userImage] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId: userId },
      include: { workOrders: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workOrder.findMany({
      where: activeRepairsWhere(userId),
      include: { vehicle: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: {
        vehicle: { ownerId: userId },
        scheduledAt: { gte: new Date() },
        status: 'SCHEDULED',
      },
      include: { vehicle: true },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    }),
    getUserImage(userId),
  ])

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
    vin: v.vin,
    plate: v.plate,
    hasActiveRepair: v.workOrders.length > 0,
  }))

  const activeRepairs = rawActiveRepairs.map(o => ({
    id: o.id,
    vehicle: `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}`,
    workOrder: `Orden de trabajo #${o.id.slice(-6).toUpperCase()}`,
    status: o.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    progressStage: o.progressStage as 'INSPECTING' | 'REPAIRING' | 'WAITING_PARTS' | null,
  }))

  const upcomingAppointments = rawAppointments.map(a => ({
    id: a.id,
    month: a.scheduledAt.toLocaleString('es-AR', { month: 'short' }).toUpperCase(),
    day: a.scheduledAt.getDate().toString(),
    title: a.title,
    vehicle: `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <DashboardContent
        userName={session.user.name ?? 'usuario'}
        vehicles={vehicles}
        activeRepairs={activeRepairs}
        upcomingAppointments={upcomingAppointments}
      />
      <DashboardFooter />
    </div>
  )
}
