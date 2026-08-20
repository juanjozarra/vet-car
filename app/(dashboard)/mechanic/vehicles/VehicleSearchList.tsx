'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, MotionConfig } from 'motion/react'
import { enter } from '@/lib/motionTokens'
import { SearchIcon, CarIcon, ChevronRightIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'

interface VehicleSearchListItem {
  id: string
  label: string
  plate: string | null
  vin: string | null
  ownerName: string
}

interface VehicleSearchListProps {
  vehicles: VehicleSearchListItem[]
}

export function VehicleSearchList({ vehicles }: VehicleSearchListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(v =>
      v.label.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      (v.plate?.toLowerCase().includes(q) ?? false) ||
      (v.vin?.toLowerCase().includes(q) ?? false)
    )
  }, [vehicles, query])

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8">
        <motion.div {...enter(0)} className="flex flex-col gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Vehículos del taller
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Historial de tus clientes.
          </h1>
        </motion.div>
        <motion.div {...enter(0.1)} className="flex flex-col gap-5">
          <div className="group relative max-w-sm">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60">
              <SearchIcon className="size-4" />
            </span>
            <Input
              placeholder="Buscar por patente, VIN o dueño"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="bezel">
              <div className="bezel-core flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                  <CarIcon className="size-6" />
                </span>
                <span className="text-sm text-muted-foreground">
                  {vehicles.length === 0
                    ? 'Todavía no hay vehículos vinculados a tu taller.'
                    : 'Ningún vehículo coincide con la búsqueda.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(v => (
                <Link
                  key={v.id}
                  href={`/mechanic/vehicles/${v.id}`}
                  className="group bezel outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <div className="bezel-core flex items-center justify-between gap-3 p-5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">{v.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{v.ownerName}</span>
                      {v.plate && (
                        <span className="mt-1 w-fit rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-foreground ring-1 ring-white/[0.1]">
                          {v.plate}
                        </span>
                      )}
                    </div>
                    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </MotionConfig>
  )
}
