import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'
import './globals.css'
import { SessionProvider } from '@/components/shared/SessionProvider'
import { cn } from '@/lib/utils'

const clashDisplay = localFont({
  src: [
    { path: './fonts/ClashDisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ClashDisplay-Semibold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-clash',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VetCar',
  description: 'Plataforma de historial de servicio vehicular',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={cn('h-full antialiased', GeistSans.variable, GeistMono.variable, clashDisplay.variable)}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
