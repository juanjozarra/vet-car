import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, address: true, image: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={user.image}
      />
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-12">
          <ProfileForm
            name={user.name ?? ''}
            email={user.email}
            phone={user.phone ?? ''}
            address={user.address ?? ''}
            image={user.image}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
