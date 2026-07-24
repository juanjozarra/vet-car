'use client'

import { useCallback, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useAutocompleteSuggestions } from '@/lib/useAutocompleteSuggestions'
import { Input } from '@/components/ui/input'
import { hasGoogleMapsKey } from './GoogleMapsProvider'

export interface PlaceLocationValue {
  address: string
  latitude: number
  longitude: number
  googlePlaceId: string | null
}

interface PlaceLocationInputProps {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress?: string
  initialLatitude?: number | null
  initialLongitude?: number | null
}

export function PlaceLocationInput({
  onSelect,
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
}: PlaceLocationInputProps) {
  if (!hasGoogleMapsKey) {
    return (
      <ManualLocationInput
        onSelect={onSelect}
        initialAddress={initialAddress}
        initialLatitude={initialLatitude}
        initialLongitude={initialLongitude}
      />
    )
  }
  return <AutocompleteLocationInput onSelect={onSelect} initialAddress={initialAddress} />
}

function AutocompleteLocationInput({
  onSelect,
  initialAddress,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
}) {
  const places = useMapsLibrary('places')
  const [inputValue, setInputValue] = useState(initialAddress)
  const { suggestions, resetSession } = useAutocompleteSuggestions(inputValue)

  const handleSuggestionClick = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!places || !suggestion.placePrediction) return

      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'id'] })

      if (!place.location) return

      setInputValue(place.formattedAddress ?? '')
      resetSession()

      onSelect({
        address: place.formattedAddress ?? '',
        latitude: place.location.lat(),
        longitude: place.location.lng(),
        googlePlaceId: place.id,
      })
    },
    [places, onSelect, resetSession]
  )

  return (
    <div className="relative flex flex-col gap-1.5">
      <Input
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder="Buscá tu taller en Google Maps"
        className="h-11"
      />
      {suggestions.length > 0 && (
        <ul className="absolute top-full z-10 mt-1.5 w-full overflow-hidden rounded-2xl bg-popover/95 p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.09] backdrop-blur-xl">
          {suggestions.map(suggestion => (
            <li key={suggestion.placePrediction?.placeId}>
              <button
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full cursor-pointer rounded-[0.625rem] px-2.5 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
              >
                {suggestion.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ManualLocationInput({
  onSelect,
  initialAddress,
  initialLatitude,
  initialLongitude,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
  initialLatitude: number | null
  initialLongitude: number | null
}) {
  const [address, setAddress] = useState(initialAddress)
  const [latitude, setLatitude] = useState(initialLatitude !== null ? String(initialLatitude) : '')
  const [longitude, setLongitude] = useState(initialLongitude !== null ? String(initialLongitude) : '')

  function emitIfComplete(next: { address: string; latitude: string; longitude: string }) {
    const lat = Number(next.latitude)
    const lng = Number(next.longitude)
    if (next.address && !Number.isNaN(lat) && !Number.isNaN(lng) && next.latitude !== '' && next.longitude !== '') {
      onSelect({ address: next.address, latitude: lat, longitude: lng, googlePlaceId: null })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={address}
        onChange={e => {
          setAddress(e.target.value)
          emitIfComplete({ address: e.target.value, latitude, longitude })
        }}
        placeholder="Dirección del taller"
        className="h-11"
      />
      <div className="flex gap-2">
        <Input
          value={latitude}
          onChange={e => {
            setLatitude(e.target.value)
            emitIfComplete({ address, latitude: e.target.value, longitude })
          }}
          placeholder="Latitud"
          type="number"
          step="any"
          className="h-11"
        />
        <Input
          value={longitude}
          onChange={e => {
            setLongitude(e.target.value)
            emitIfComplete({ address, latitude, longitude: e.target.value })
          }}
          placeholder="Longitud"
          type="number"
          step="any"
          className="h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Google Maps no está configurado. Ingresá la dirección y las coordenadas manualmente (podés obtenerlas
        haciendo clic derecho en Google Maps y copiando &quot;Latitud, Longitud&quot;).
      </p>
    </div>
  )
}
