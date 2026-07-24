import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'
import type { WorkOrder } from '@prisma/client'

function makeTx() {
  return {
    appointment: { update: jest.fn() },
    historyEntry: { findFirst: jest.fn(), create: jest.fn() },
  }
}

const workOrder = {
  id: 'wo1',
  title: 'Cambio de aceite',
  description: 'Ruido en el motor',
  vehicleId: 'v1',
  mechanicId: 'm1',
  appointmentId: 'a1',
} as WorkOrder

describe('ON_STATUS_CHANGE table', () => {
  it('has no entry for PENDING or IN_PROGRESS', () => {
    expect(ON_STATUS_CHANGE.PENDING).toBeUndefined()
    expect(ON_STATUS_CHANGE.IN_PROGRESS).toBeUndefined()
  })
})

describe('ON_STATUS_CHANGE.COMPLETED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to COMPLETED', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'COMPLETED' } })
  })

  it('does not touch the appointment when there is none linked', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, { ...workOrder, appointmentId: null }, 'ws1')
    expect(tx.appointment.update).not.toHaveBeenCalled()
  })

  it('creates a HistoryEntry when none exists yet', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).toHaveBeenCalledWith({
      data: {
        vehicleId: 'v1',
        type: 'OTHER',
        description: 'Cambio de aceite — Ruido en el motor',
        performedAt: expect.any(Date),
        source: 'MECHANIC',
        createdById: 'm1',
        workshopId: 'ws1',
        workOrderId: 'wo1',
      },
    })
  })

  it('uses only the title when there is no description', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, { ...workOrder, description: null }, 'ws1')
    expect(tx.historyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Cambio de aceite' }) })
    )
  })

  it('does not create a duplicate HistoryEntry when one already exists', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue({ id: 'h1' })
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })
})

describe('ON_STATUS_CHANGE.CANCELLED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to CANCELLED', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(tx as any, workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'CANCELLED' } })
  })

  it('does not touch history', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })
})
