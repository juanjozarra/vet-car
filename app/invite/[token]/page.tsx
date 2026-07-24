import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { InviteActions } from './InviteActions'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [session, invite] = await Promise.all([getServerSession(authOptions), getPendingInvite(token)])

  if (!invite) {
    return (
      <AuthShell
        eyebrow="Invitación"
        headline="Esta invitación ya no es válida."
        sub="Pedile a tu taller que te envíe una nueva."
      >
        <div className="bezel">
          <div className="bezel-core flex flex-col items-center gap-4 p-8 text-center">
            <Button asChild variant="secondary">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  if (!session) {
    const inviteUrl = `/invite/${token}`
    const encodedCallbackUrl = encodeURIComponent(inviteUrl)
    return (
      <AuthShell
        eyebrow="Invitación"
        headline={`Te invitaron a unirte a ${invite.workshop.name}`}
        sub="Iniciá sesión o creá una cuenta para aceptar."
      >
        <div className="bezel">
          <div className="bezel-core flex flex-col gap-4 p-8">
            <Button asChild size="lg" className="w-full">
              <Link href={`/login?callbackUrl=${encodedCallbackUrl}`}>Iniciar sesión</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full">
              <Link
                href={`/register?callbackUrl=${encodedCallbackUrl}&email=${encodeURIComponent(invite.email)}&role=MECHANIC`}
              >
                Crear cuenta
              </Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  const emailMismatch = session.user.role !== 'MECHANIC' || session.user.email !== invite.email
  const alreadyInWorkshop = !emailMismatch && session.user.workshopId !== null

  if (emailMismatch || alreadyInWorkshop) {
    return (
      <AuthShell
        eyebrow="Invitación"
        headline={emailMismatch ? 'Esta invitación es para otra cuenta' : 'Ya pertenecés a un taller'}
        sub={
          emailMismatch
            ? `Iniciá sesión con ${invite.email} para aceptarla.`
            : 'Salí de tu taller actual antes de aceptar una nueva invitación.'
        }
      >
        <div className="bezel">
          <div className="bezel-core p-8 text-center">
            <Button asChild variant="secondary">
              <Link href="/mechanic">Ir a mi panel</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Invitación"
      headline={`Te invitaron a unirte a ${invite.workshop.name}`}
      sub={invite.workshop.address}
    >
      <InviteActions token={token} />
    </AuthShell>
  )
}
