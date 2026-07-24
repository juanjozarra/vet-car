import { HistorySource, ServiceItemType } from '@prisma/client'
import { prisma } from './prisma'
import { canAccessVehicleHistory, type SessionUser } from './vehicleAccess'

export type HistoryEntrySummary = {
  id: string
  type: ServiceItemType
  description: string
  performedAt: string
  odometerReading: number | null
  cost: number | null
  photoUrl: string | null
  source: HistorySource
  createdById: string
  createdByName: string | null
  workshopName: string | null
}

export type VehicleWithHistory = {
  id: string
  make: string
  model: string
  year: number
  nickname: string | null
  plate: string | null
  vin: string | null
  photoUrl: string | null
  historyEntries: HistoryEntrySummary[]
}

export async function getVehicleWithHistory(
  user: SessionUser,
  vehicleId: string
): Promise<VehicleWithHistory | null> {
  const hasAccess = await canAccessVehicleHistory(user, vehicleId)
  if (!hasAccess) return null

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      historyEntries: {
        orderBy: { performedAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          workshop: { select: { name: true } },
        },
      },
    },
  })
  if (!vehicle) return null

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    nickname: vehicle.nickname,
    plate: vehicle.plate,
    vin: vehicle.vin,
    photoUrl: vehicle.photoUrl,
    historyEntries: vehicle.historyEntries.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      performedAt: e.performedAt.toISOString(),
      odometerReading: e.odometerReading,
      cost: e.cost,
      photoUrl: e.photoUrl,
      source: e.source,
      createdById: e.createdById,
      createdByName: e.createdBy.name,
      workshopName: e.workshop?.name ?? null,
    })),
  }
}

export async function getOwnHistoryEntry(userId: string, entryId: string) {
  const entry = await prisma.historyEntry.findUnique({ where: { id: entryId } })
  if (entry?.createdById !== userId) return null
  return entry
}

export function parseOptionalNumber(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : 'invalid'
}

export type ParsedHistoryEntryInput = {
  type: ServiceItemType
  description: string
  performedAt: Date
  odometerReading: number | null
  cost: number | null
  photoUrl: string | null
}

export function parseHistoryEntryInput(
  body: Record<string, unknown>
): ParsedHistoryEntryInput | { error: string } {
  const { type, description, performedAt, odometerReading, cost, photoUrl } = body

  if (!type || !Object.values(ServiceItemType).includes(type as ServiceItemType)) {
    return { error: 'A valid type is required' }
  }
  if (!description || typeof description !== 'string') {
    return { error: 'description is required' }
  }
  const parsedDate = new Date(performedAt as string)
  if (!performedAt || Number.isNaN(parsedDate.getTime())) {
    return { error: 'A valid performedAt date is required' }
  }
  const odometerReadingValue = parseOptionalNumber(odometerReading)
  if (odometerReadingValue === 'invalid') {
    return { error: 'odometerReading must be a number' }
  }
  const costValue = parseOptionalNumber(cost)
  if (costValue === 'invalid') {
    return { error: 'cost must be a number' }
  }

  return {
    type: type as ServiceItemType,
    description,
    performedAt: parsedDate,
    odometerReading: odometerReadingValue,
    cost: costValue,
    photoUrl: typeof photoUrl === 'string' ? photoUrl : null,
  }
}
