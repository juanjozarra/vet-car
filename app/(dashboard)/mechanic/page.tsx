import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function MechanicDashboard() {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== 'MECHANIC') {
    redirect('/dashboard/owner')
  }

  return (
    <main>
      <h1>Mechanic Dashboard</h1>
    </main>
  )
}
