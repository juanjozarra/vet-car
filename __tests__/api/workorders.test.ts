jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workOrderStatusEffects', () => ({ ON_STATUS_CHANGE: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workOrder: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { PATCH } from '@/app/api/workorders/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'

const mockGetServerSession = getServerSession as jest.Mock
const mockWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockUpdate = prisma.workOrder.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/workorders/wo1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
const params = Promise.resolve({ id: 'wo1' })

const mechanicSession = { user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } }
const existingWorkOrder = { id: 'wo1', title: 'Cambio de aceite', mechanic: { workshopId: 'ws1' } }

describe('PATCH /api/workorders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 for an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the work order does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the work order belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue({ id: 'wo1', mechanic: { workshopId: 'ws-other' } })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid status value', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const res = await PATCH(makeRequest({ status: 'NOT_A_STATUS' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when reassigning to a mechanic outside the workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUserFindUnique.mockResolvedValue({ workshopId: 'ws-other' })
    const res = await PATCH(makeRequest({ mechanicId: 'm2' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates status without a side effect for PENDING/IN_PROGRESS', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, status: 'IN_PROGRESS' })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'wo1' }, data: { status: 'IN_PROGRESS' } })
  })

  it('calls the matching status effect when one is registered', async () => {
    const mockEffect = jest.fn().mockResolvedValue(undefined)
    ;(ON_STATUS_CHANGE as Record<string, jest.Mock>).COMPLETED = mockEffect
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const updatedRow = { ...existingWorkOrder, status: 'COMPLETED' }
    mockUpdate.mockResolvedValue(updatedRow)
    const res = await PATCH(makeRequest({ status: 'COMPLETED' }), { params })
    expect(res.status).toBe(200)
    expect(mockEffect).toHaveBeenCalledWith(prisma, updatedRow, 'ws1')
    delete (ON_STATUS_CHANGE as Record<string, jest.Mock>).COMPLETED
  })

  it('updates title, description, and mechanicId together', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUserFindUnique.mockResolvedValue({ workshopId: 'ws1' })
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, title: 'Nuevo título', mechanicId: 'm2' })
    const res = await PATCH(makeRequest({ title: 'Nuevo título', mechanicId: 'm2' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { title: 'Nuevo título', mechanicId: 'm2' },
    })
  })

  it('returns 400 for an invalid progressStage value', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const res = await PATCH(makeRequest({ progressStage: 'NOT_A_STAGE' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates progressStage', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, progressStage: 'REPAIRING' })
    const res = await PATCH(makeRequest({ progressStage: 'REPAIRING' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'wo1' }, data: { progressStage: 'REPAIRING' } })
  })
})
