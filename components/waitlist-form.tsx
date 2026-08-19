'use client'

import { useState } from 'react'

export function WaitlistForm({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setMessage(data.error ?? 'Something went wrong')
      } else if (data.already) {
        setState('success')
        setMessage("You're already on the list — we'll be in touch!")
      } else {
        setState('success')
        setMessage("You're on the list! We'll notify you at launch.")
      }
    } catch {
      setState('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  if (state === 'success') {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-5 py-3.5 ${dark ? 'bg-white/10 text-white' : 'bg-brand-50 text-brand-700'} ${className}`}>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={state === 'loading'}
        className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 ${
          dark
            ? 'border-white/20 bg-white/10 text-white placeholder:text-white/40'
            : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
        }`}
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {state === 'loading' ? 'Joining…' : 'Join the waitlist'}
      </button>
      {state === 'error' && (
        <p className={`text-xs mt-1 ${dark ? 'text-red-300' : 'text-red-500'}`}>{message}</p>
      )}
    </form>
  )
}
