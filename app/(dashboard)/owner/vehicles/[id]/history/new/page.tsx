import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'

export default async function OwnerNewHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const { id } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, id)
  if (!hasAccess) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <HistoryEntryForm vehicleId={id} backHref={`/owner/vehicles/${id}`} mode="create" />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
