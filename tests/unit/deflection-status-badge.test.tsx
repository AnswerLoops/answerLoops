// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeflectionStatusBadge } from '@/components/ui/badge'

describe('DeflectionStatusBadge', () => {
  it('shows the "On" label using the same green token as the resolved StatusBadge when enabled', () => {
    render(<DeflectionStatusBadge enabled={true} />)

    const badge = screen.getByText('Automatic Deflections: On')
    expect(badge).toBeTruthy()
    // Same color token as StatusBadge's `resolved` state (bg-emerald-100 text-emerald-800).
    expect(badge.className).toContain('bg-emerald-100')
    expect(badge.className).toContain('text-emerald-800')
  })

  it('shows the "Off" label using the same red token as PriorityBadge\'s critical state when disabled', () => {
    render(<DeflectionStatusBadge enabled={false} />)

    const badge = screen.getByText('Automatic Deflections: Off')
    expect(badge).toBeTruthy()
    // Same color token as PriorityBadge's `critical` state (bg-red-100 text-red-800).
    expect(badge.className).toContain('bg-red-100')
    expect(badge.className).toContain('text-red-800')
  })

  it('does not show the opposite state\'s label or color at the same time', () => {
    render(<DeflectionStatusBadge enabled={true} />)

    expect(screen.queryByText('Automatic Deflections: Off')).toBeNull()
    const badge = screen.getByText('Automatic Deflections: On')
    expect(badge.className).not.toContain('bg-red-100')
  })
})
