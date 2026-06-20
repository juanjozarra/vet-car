import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { DashboardContent } from './DashboardContent'

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const userName = session.user.name ?? 'there'

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav userName={userName} />
      <DashboardContent userName={userName} />
      <DashboardFooter />
    </div>
  )
}
