jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@vercel/blob/client', () => ({ handleUpload: jest.fn() }))

import { POST } from '@/app/api/history/upload/route'
import { getServerSession } from 'next-auth'
import { handleUpload } from '@vercel/blob/client'

function makeRequest(body: object) {
  return new Request('http://localhost/api/history/upload', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/history/upload', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated, without calling handleUpload', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(401)
    expect(handleUpload).not.toHaveBeenCalled()
  })

  it('delegates to handleUpload and returns its response when authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER' } })
    ;(handleUpload as jest.Mock).mockResolvedValue({ type: 'blob.generate-client-token', clientToken: 'tok' })
    const res = await POST(makeRequest({ type: 'blob.generate-client-token', payload: {} }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.clientToken).toBe('tok')
  })

  it('returns 400 when handleUpload rejects the request', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER' } })
    ;(handleUpload as jest.Mock).mockRejectedValue(new Error('invalid content type'))
    const res = await POST(makeRequest({ type: 'blob.generate-client-token', payload: {} }))
    expect(res.status).toBe(400)
  })
})
