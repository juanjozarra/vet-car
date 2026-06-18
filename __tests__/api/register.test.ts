jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))

import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'

const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockCreate = prisma.user.create as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when fields are missing', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 when role is invalid', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com', password: 'pass1234', role: 'ADMIN' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid role')
  })

  it('returns 409 when email already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })
    const res = await POST(makeRequest({ name: 'Test', email: 'exists@test.com', password: 'pass1234', role: 'OWNER' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('Email already in use')
  })

  it('creates OWNER user and returns 201', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'user-1', name: 'Test', email: 'test@test.com', role: 'OWNER' })

    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com', password: 'pass1234', role: 'OWNER' }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Test', email: 'test@test.com', password: 'hashed_password', role: 'OWNER' },
      select: { id: true, email: true, role: true, name: true },
    })
    const data = await res.json()
    expect(data.role).toBe('OWNER')
  })

  it('creates MECHANIC user and returns 201', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'user-2', name: 'Mech', email: 'mech@test.com', role: 'MECHANIC' })

    const res = await POST(makeRequest({ name: 'Mech', email: 'mech@test.com', password: 'pass1234', role: 'MECHANIC' }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Mech', email: 'mech@test.com', password: 'hashed_password', role: 'MECHANIC' },
      select: { id: true, email: true, role: true, name: true },
    })
  })
})
