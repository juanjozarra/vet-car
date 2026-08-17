import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'
import type { Prisma, WorkOrder } from '@prisma/client'

function makeTx() {
  return {
    workOrder: { update: jest.fn() },
    appointment: { update: jest.fn() },
    historyEntry: { findFirst: jest.fn(), create: jest.fn() },
  }
}

// Widen only at the call boundary: the local `tx` keeps its jest.fn() types so the
// assertions below each call stay checked.
const asTx = (tx: ReturnType<typeof makeTx>) => tx as unknown as Prisma.TransactionClient

const workOrder = {
  id: 'wo1',
  title: 'Cambio de aceite',
  description: 'Ruido en el motor',
  vehicleId: 'v1',
  mechanicId: 'm1',
  appointmentId: 'a1',
} as WorkOrder

describe('ON_STATUS_CHANGE table', () => {
  it('has no entry for PENDING', () => {
    expect(ON_STATUS_CHANGE.PENDING).toBeUndefined()
  })
})

describe('ON_STATUS_CHANGE.IN_PROGRESS', () => {
  beforeEach(() => jest.clearAllMocks())

  it('defaults progressStage to INSPECTING when unset', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.IN_PROGRESS!(asTx(tx), { ...workOrder, progressStage: null }, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { progressStage: 'INSPECTING' },
    })
  })

  it('does not override an already-set progressStage', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.IN_PROGRESS!(asTx(tx), { ...workOrder, progressStage: 'REPAIRING' }, 'ws1')
    expect(tx.workOrder.update).not.toHaveBeenCalled()
  })
})

describe('ON_STATUS_CHANGE.COMPLETED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to COMPLETED', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'COMPLETED' } })
  })

  it('does not touch the appointment when there is none linked', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), { ...workOrder, appointmentId: null }, 'ws1')
    expect(tx.appointment.update).not.toHaveBeenCalled()
  })

  it('creates a HistoryEntry when none exists yet', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), workOrder, 'ws1')
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
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), { ...workOrder, description: null }, 'ws1')
    expect(tx.historyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Cambio de aceite' }) })
    )
  })

  it('does not create a duplicate HistoryEntry when one already exists', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue({ id: 'h1' })
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })

  it('stamps closedAt on the work order', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(asTx(tx), workOrder, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { closedAt: expect.any(Date) },
    })
  })
})

describe('ON_STATUS_CHANGE.CANCELLED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to CANCELLED', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(asTx(tx), workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'CANCELLED' } })
  })

  it('does not touch history', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(asTx(tx), workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })

  it('stamps closedAt on the work order', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(asTx(tx), workOrder, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { closedAt: expect.any(Date) },
    })
  })
})
