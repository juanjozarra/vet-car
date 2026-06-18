'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Role = 'OWNER' | 'MECHANIC'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!role) return

    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.')
      router.push('/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  if (!role) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-600 text-sm">I am a…</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setRole('OWNER')}
              className="border-2 rounded-lg p-4 text-left hover:border-blue-600 transition-colors"
            >
              <div className="font-semibold">Car Owner</div>
              <div className="text-sm text-gray-500">View my vehicle history and approve quotes</div>
            </button>
            <button
              onClick={() => setRole('MECHANIC')}
              className="border-2 rounded-lg p-4 text-left hover:border-blue-600 transition-colors"
            >
              <div className="font-semibold">Mechanic</div>
              <div className="text-sm text-gray-500">Manage clients, vehicles, and work orders</div>
            </button>
          </div>
          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 underline">Sign in</a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">
            {role === 'OWNER' ? 'Car Owner' : 'Mechanic'} account
          </h1>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 underline">Sign in</a>
        </p>
      </form>
    </main>
  )
}
