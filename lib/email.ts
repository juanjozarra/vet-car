import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendWorkshopInviteEmail({
  to,
  workshopName,
  inviterName,
  acceptUrl,
}: {
  to: string
  workshopName: string
  inviterName: string
  acceptUrl: string
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} te invitó a unirte a ${workshopName} en VetCar`,
    html: `
      <p>${inviterName} te invitó a unirte a <strong>${workshopName}</strong> como mecánico en VetCar.</p>
      <p><a href="${acceptUrl}">Aceptar invitación</a></p>
      <p>Este enlace vence en 7 días.</p>
    `,
  })

  if (error) {
    throw new Error(error.message)
  }
}
