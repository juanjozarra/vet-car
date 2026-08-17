jest.mock('resend', () => {
  const mockSendFn = jest.fn()
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSendFn },
    })),
    __mockSend: mockSendFn,
  }
})

import { sendWorkshopInviteEmail } from '@/lib/email'
import * as resendModule from 'resend'

const { __mockSend: mockSend } = resendModule as unknown as { __mockSend: jest.Mock }

describe('sendWorkshopInviteEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  const args = {
    to: 'mech@test.com',
    workshopName: 'AutoShop',
    inviterName: 'Juan',
    acceptUrl: 'http://localhost:3000/invite/tok123',
  }

  it('sends an email addressed to the invitee, mentioning the workshop', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    await sendWorkshopInviteEmail(args)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mech@test.com',
        subject: expect.stringContaining('AutoShop'),
        html: expect.stringContaining('http://localhost:3000/invite/tok123'),
      })
    )
  })

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'invalid domain' } })
    await expect(sendWorkshopInviteEmail(args)).rejects.toThrow('invalid domain')
  })
})
