import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== 'OWNER') {
    redirect('/dashboard/mechanic')
  }

  return (
    <main>
      <h1>Owner Dashboard</h1>
    </main>
  )
}
