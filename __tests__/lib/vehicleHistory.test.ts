jest.mock('@/lib/vehicleAccess', () => ({ canAccessVehicleHistory: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn() },
    historyEntry: { findUnique: jest.fn() },
  },
}))

import {
  getVehicleWithHistory,
  getOwnHistoryEntry,
  parseOptionalNumber,
  parseHistoryEntryInput,
} from '@/lib/vehicleHistory'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

const sessionUser = { id: 'u1', role: 'OWNER' as const, workshopId: null }

describe('getVehicleWithHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when access is denied', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(false)
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(result).toBeNull()
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled()
  })

  it('returns null when the vehicle does not exist', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(result).toBeNull()
  })

  it('flattens the vehicle and its history entries, newest performedAt first', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v1', make: 'Honda', model: 'CR-V', year: 2020, nickname: null, plate: 'ABC123', vin: null, photoUrl: null,
      historyEntries: [{
        id: 'h1', type: 'MAINTENANCE', description: 'Cambio de aceite',
        performedAt: new Date('2026-01-01T00:00:00.000Z'),
        odometerReading: 50000, cost: 100, photoUrl: null, source: 'OWNER', createdById: 'u1',
        createdBy: { name: 'Alice' }, workshop: null,
      }],
    })
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
      where: { id: 'v1' },
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
    expect(result?.historyEntries).toEqual([{
      id: 'h1', type: 'MAINTENANCE', description: 'Cambio de aceite',
      performedAt: '2026-01-01T00:00:00.000Z',
      odometerReading: 50000, cost: 100, photoUrl: null, source: 'OWNER', createdById: 'u1',
      createdByName: 'Alice', workshopName: null,
    }])
  })
})

describe('getOwnHistoryEntry', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when the entry does not exist', async () => {
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toBeNull()
  })

  it('returns null when the entry belongs to someone else', async () => {
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toBeNull()
  })

  it('returns the entry when the caller is its author', async () => {
    const entry = { id: 'h1', createdById: 'u1' }
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(entry)
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toEqual(entry)
  })
})

describe('parseOptionalNumber', () => {
  it('returns null for empty, null, or undefined input', () => {
    expect(parseOptionalNumber('')).toBeNull()
    expect(parseOptionalNumber(null)).toBeNull()
    expect(parseOptionalNumber(undefined)).toBeNull()
  })

  it('returns the parsed number for valid numeric input', () => {
    expect(parseOptionalNumber(50000)).toBe(50000)
    expect(parseOptionalNumber('42.5')).toBe(42.5)
  })

  it('returns "invalid" for non-numeric input', () => {
    expect(parseOptionalNumber('abc')).toBe('invalid')
  })
})

const validEntryBody = {
  type: 'MAINTENANCE',
  description: 'Cambio de aceite',
  performedAt: '2026-01-01',
  odometerReading: 50000,
  cost: 100,
  photoUrl: null,
}

describe('parseHistoryEntryInput', () => {
  it('returns the parsed fields for a fully valid body', () => {
    const result = parseHistoryEntryInput(validEntryBody)
    expect(result).toEqual({
      type: 'MAINTENANCE',
      description: 'Cambio de aceite',
      performedAt: new Date('2026-01-01'),
      odometerReading: 50000,
      cost: 100,
      photoUrl: null,
    })
  })

  it('defaults odometerReading, cost, and photoUrl to null when omitted', () => {
    const result = parseHistoryEntryInput({
      type: 'REPAIR',
      description: 'Cambio de pastillas',
      performedAt: '2026-01-01',
    })
    expect(result).toEqual({
      type: 'REPAIR',
      description: 'Cambio de pastillas',
      performedAt: new Date('2026-01-01'),
      odometerReading: null,
      cost: null,
      photoUrl: null,
    })
  })

  it('returns an error when type is missing or not a valid ServiceItemType', () => {
    expect(parseHistoryEntryInput({ ...validEntryBody, type: undefined })).toEqual({ error: 'A valid type is required' })
    expect(parseHistoryEntryInput({ ...validEntryBody, type: 'NOT_A_TYPE' })).toEqual({ error: 'A valid type is required' })
  })

  it('returns an error when description is missing or empty', () => {
    expect(parseHistoryEntryInput({ ...validEntryBody, description: '' })).toEqual({ error: 'description is required' })
  })

  it('returns an error when performedAt is missing or invalid', () => {
    expect(parseHistoryEntryInput({ ...validEntryBody, performedAt: undefined })).toEqual({
      error: 'A valid performedAt date is required',
    })
    expect(parseHistoryEntryInput({ ...validEntryBody, performedAt: 'not-a-date' })).toEqual({
      error: 'A valid performedAt date is required',
    })
  })

  it('returns an error when odometerReading is not a number', () => {
    expect(parseHistoryEntryInput({ ...validEntryBody, odometerReading: 'abc' })).toEqual({
      error: 'odometerReading must be a number',
    })
  })

  it('returns an error when cost is not a number', () => {
    expect(parseHistoryEntryInput({ ...validEntryBody, cost: 'abc' })).toEqual({ error: 'cost must be a number' })
  })
})
