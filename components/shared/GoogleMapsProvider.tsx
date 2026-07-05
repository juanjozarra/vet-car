'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY)

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) return <>{children}</>

  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{children}</APIProvider>
}
