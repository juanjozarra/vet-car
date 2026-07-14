jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    historyEntry: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))

import { PATCH, DELETE } from '@/app/api/history/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

function makeRequest(method: string, body?: object) {
  return new Request('http://localhost/api/history/h1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const params = Promise.resolve({ id: 'h1' })
const validBody = {
  type: 'REPAIR',
  description: 'Cambio de pastillas de freno',
  performedAt: '2026-02-01',
  odometerReading: 51000,
  cost: 200,
  photoUrl: null,
}

describe('PATCH /api/history/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the entry does not exist', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the caller is not the author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the body is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    const res = await PATCH(makeRequest('PATCH', { ...validBody, type: 'NOT_A_TYPE' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates the entry and returns 200 for its author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    ;(prisma.historyEntry.update as jest.Mock).mockResolvedValue({ id: 'h1', ...validBody })
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('h1')
  })
})

describe('DELETE /api/history/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the caller is not the author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('deletes the entry and returns 204 for its author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(204)
    expect(prisma.historyEntry.delete).toHaveBeenCalledWith({ where: { id: 'h1' } })
  })
})
