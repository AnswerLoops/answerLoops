'use client'

import { useState } from 'react'
import Link from 'next/link'

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[0.625rem] flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
          <p className="text-xs text-gray-500 px-2 py-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Link
            href="/tickets"
            onClick={() => setOpen(false)}
            className="block px-2 py-1.5 text-sm text-brand-600 hover:bg-gray-50 rounded"
          >
            View all tickets →
          </Link>
        </div>
      )}
    </div>
  )
}
