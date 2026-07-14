// app/(dashboard)/owner/vehicles/[id]/history/[entryId]/edit/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getOwnHistoryEntry } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'

export default async function OwnerEditHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const { id, entryId } = await params
  const entry = await getOwnHistoryEntry(session.user.id, entryId)
  if (!entry) notFound()

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
          <HistoryEntryForm
            vehicleId={id}
            backHref={`/owner/vehicles/${id}`}
            mode="edit"
            entryId={entry.id}
            initialValues={{
              type: entry.type,
              description: entry.description,
              performedAt: entry.performedAt.toISOString(),
              odometerReading: entry.odometerReading,
              cost: entry.cost,
              photoUrl: entry.photoUrl,
            }}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
