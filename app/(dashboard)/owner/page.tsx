import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { DashboardContent } from './DashboardContent'

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const userId = session.user.id

  const [rawVehicles, rawActiveRepairs, rawAppointments] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId: userId },
      include: { workOrders: { where: { status: 'IN_PROGRESS' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workOrder.findMany({
      where: { vehicle: { ownerId: userId }, status: 'IN_PROGRESS' },
      include: { vehicle: true },
      orderBy: { updatedAt: 'desc' },
      take: 3,
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
    workOrder: `Work Order #${o.id.slice(-6).toUpperCase()}`,
    status: o.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  }))

  const upcomingAppointments = rawAppointments.map(a => ({
    id: a.id,
    month: a.scheduledAt.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: a.scheduledAt.getDate().toString(),
    title: a.title,
    vehicle: `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'there'}
        userEmail={session.user.email ?? undefined}
      />
      <DashboardContent
        userName={session.user.name ?? 'there'}
        vehicles={vehicles}
        activeRepairs={activeRepairs}
        upcomingAppointments={upcomingAppointments}
      />
      <DashboardFooter />
    </div>
  )
}
