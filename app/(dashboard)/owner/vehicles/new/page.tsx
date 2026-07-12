import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { NewVehicleForm } from './NewVehicleForm'

export default async function NewVehiclePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNav
        userName={session.user.name ?? 'there'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <NewVehicleForm />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
