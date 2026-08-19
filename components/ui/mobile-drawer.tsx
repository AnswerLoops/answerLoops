'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

export function MobileDrawer({
  children,
  triggerLabel = 'Open menu',
  triggerClassName = '',
}: {
  children: React.ReactNode
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className={`inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 ${triggerClassName}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-end p-2 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
