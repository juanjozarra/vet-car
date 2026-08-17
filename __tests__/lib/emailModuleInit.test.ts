// Guards the production build. The Resend constructor throws "Missing API key" when
// RESEND_API_KEY is absent, and Next evaluates lib/email.ts while collecting page data
// for /api/workshop/invites — so constructing the client at module scope makes
// `pnpm build` fail outright in any environment without the key (CI, a fresh worktree,
// a deploy target where the secret is only set at runtime).
//
// Deliberately does NOT mock 'resend': the point is to exercise the real constructor.
describe('lib/email module initialization', () => {
  const originalKey = process.env.RESEND_API_KEY

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY
    } else {
      process.env.RESEND_API_KEY = originalKey
    }
  })

  it('imports without RESEND_API_KEY set', async () => {
    delete process.env.RESEND_API_KEY
    jest.resetModules()

    await expect(import('@/lib/email')).resolves.toHaveProperty('sendWorkshopInviteEmail')
  })
})
