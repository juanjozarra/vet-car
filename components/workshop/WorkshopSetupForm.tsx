'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function WorkshopSetupForm() {
  const { update } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const address = (form.elements.namedItem('address') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    const res = await fetch('/api/workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, email }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create workshop')
      setLoading(false)
      return
    }

    await update()
    router.push('/mechanic')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <h1 className="text-2xl font-bold">Set up your workshop</h1>
        <p className="text-gray-600 text-sm mt-1">Tell us about your workshop to get started.</p>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-name" className="text-sm font-medium">Workshop name</label>
        <input
          id="ws-name"
          name="name"
          type="text"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-address" className="text-sm font-medium">Address</label>
        <input
          id="ws-address"
          name="address"
          type="text"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-phone" className="text-sm font-medium">Phone</label>
        <input
          id="ws-phone"
          name="phone"
          type="tel"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-email" className="text-sm font-medium">Workshop email</label>
        <input
          id="ws-email"
          name="email"
          type="email"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Creating workshop…' : 'Create workshop'}
      </button>
    </form>
  )
}
