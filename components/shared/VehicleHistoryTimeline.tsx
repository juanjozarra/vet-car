'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { enter, motionTokens } from '@/lib/motionTokens'
import { WrenchIcon, OdometerIcon, SearchIcon, FilterIcon, TrashIcon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SERVICE_ITEM_TYPE_LABELS, SERVICE_ITEM_TYPE_OPTIONS } from '@/lib/serviceItemType'
import { EMPTY_HISTORY_FILTERS, filterHistoryEntries, type HistoryFilters } from '@/lib/historyFilters'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'
import type { HistoryEntrySummary } from '@/lib/vehicleHistory'

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

const SOURCE_OPTIONS = [
  { value: 'MECHANIC', label: 'Taller' },
  { value: 'OWNER', label: 'Dueño' },
] as const

interface VehicleHistoryTimelineProps {
  entries: HistoryEntrySummary[]
  currentUserId: string
  basePath: string
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Badge asChild variant={active ? 'active' : 'idle'}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="cursor-pointer outline-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {children}
      </button>
    </Badge>
  )
}

export function VehicleHistoryTimeline({ entries, currentUserId, basePath }: VehicleHistoryTimelineProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS)

  const filtered = useMemo(() => filterHistoryEntries(entries, filters), [entries, filters])

  async function handleDelete(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('No se pudo eliminar el registro.')
        return
      }
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <motion.div {...enter(0.1)} className="bezel">
        <div className="bezel-core flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
            <WrenchIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-medium text-foreground">Todavía no hay registros</span>
            <span className="text-sm text-muted-foreground">Agregá el primero para empezar el historial.</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-4">
        <FormErrorBanner error={error} />

        <motion.div {...enter(0.1)} className="bezel">
          <div className="bezel-core flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="relative lg:w-64 lg:shrink-0">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60">
                <SearchIcon className="size-3.5" />
              </span>
              <Input
                placeholder="Buscar servicio, taller o autor"
                value={filters.query}
                onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
                aria-label="Buscar en el historial"
                className="h-10 pl-9 text-sm"
              />
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              <FilterIcon className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              <FilterChip
                active={filters.type === 'ALL'}
                onClick={() => setFilters(f => ({ ...f, type: 'ALL' }))}
              >
                Todo
              </FilterChip>
              {SERVICE_ITEM_TYPE_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.value}
                  active={filters.type === opt.value}
                  onClick={() => setFilters(f => ({ ...f, type: opt.value }))}
                >
                  {opt.label}
                </FilterChip>
              ))}
              <span className="mx-1 h-4 w-px shrink-0 bg-white/[0.09]" aria-hidden="true" />
              {SOURCE_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.value}
                  active={filters.source === opt.value}
                  onClick={() =>
                    setFilters(f => ({ ...f, source: f.source === opt.value ? 'ALL' : opt.value }))
                  }
                >
                  {opt.label}
                </FilterChip>
              ))}
            </div>

            <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/70">
              {filtered.length} de {entries.length}
            </span>
          </div>
        </motion.div>

        <motion.div {...enter(0.18)} className="bezel">
          <div className="bezel-core flex flex-col p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Ningún registro coincide con los filtros.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: motionTokens.distance.sm }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      duration: motionTokens.duration.normal,
                      ease: motionTokens.easing.fluid,
                      delay: Math.min(i, 8) * 0.03,
                    }}
                    className="flex items-center gap-3 rounded-[0.625rem] border-b border-white/[0.05] px-2.5 py-2.5 transition-colors duration-300 last:border-b-0 hover:bg-white/[0.03]"
                  >
                    {entry.photoUrl ? (
                      <a
                        href={entry.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.photoUrl}
                          alt="Foto del registro"
                          className="size-9 rounded-lg object-cover ring-1 ring-white/[0.08]"
                        />
                      </a>
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08]">
                        <WrenchIcon className="size-4" />
                      </span>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm text-foreground/90" title={entry.description}>
                        {entry.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                        <span>{DATE_FORMATTER.format(new Date(entry.performedAt))}</span>
                        <span className="text-muted-foreground/40" aria-hidden="true">
                          ·
                        </span>
                        <span>{SERVICE_ITEM_TYPE_LABELS[entry.type]}</span>
                        {entry.odometerReading !== null && (
                          <span className="flex items-center gap-1">
                            <OdometerIcon className="size-3" />
                            {entry.odometerReading.toLocaleString('es-AR')} km
                          </span>
                        )}
                        {entry.cost !== null && <span>${entry.cost.toLocaleString('es-AR')}</span>}
                      </div>
                    </div>

                    <Badge
                      variant={entry.source === 'MECHANIC' ? 'ok' : 'idle'}
                      className="hidden max-w-[10rem] md:inline-flex"
                    >
                      <span className="truncate">
                        {entry.source === 'MECHANIC' ? (entry.workshopName ?? 'Taller') : 'Dueño'}
                      </span>
                    </Badge>

                    {entry.createdById === currentUserId && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button asChild variant="secondary" size="xs">
                          <Link href={`${basePath}/history/${entry.id}/edit`}>Editar</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDelete(entry.id)}
                          aria-label={`Eliminar registro del ${DATE_FORMATTER.format(new Date(entry.performedAt))}`}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  )
}
