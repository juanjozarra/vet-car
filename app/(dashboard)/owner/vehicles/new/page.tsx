import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { NewVehicleForm } from './NewVehicleForm'

export default async function NewVehiclePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  return (
    <div className="flex flex-col min-h-screen bg-[#0b1326]">
      <DashboardNav
        userName={session.user.name ?? 'there'}
        userEmail={session.user.email ?? undefined}
      />
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-12">
          <NewVehicleForm />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
