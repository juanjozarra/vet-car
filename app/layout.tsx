import type { Metadata } from 'next'
import { JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/shared/SessionProvider'
import { cn } from '@/lib/utils'

const jetbrainsMono = JetBrains_Mono({
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
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
    <html lang="es" className={cn('h-full', 'antialiased', jetbrainsMono.variable, inter.variable)}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
