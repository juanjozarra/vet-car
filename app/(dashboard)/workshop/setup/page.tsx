import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { WorkshopSetupForm } from '@/components/workshop/WorkshopSetupForm'

export default async function WorkshopSetupPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (session.user.workshopId) redirect('/mechanic')

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#121414]">
      <WorkshopSetupForm />
    </main>
  )
}
