// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AnimatedChat } from '@/components/animated-chat'

function mockMotionPreference(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('AnimatedChat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMotionPreference(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders a realistic support workspace and incoming question immediately', () => {
    render(<AnimatedChat />)

    expect(screen.getByText('DevVault')).toBeInTheDocument()
    expect(screen.getAllByText('# support').length).toBeGreaterThan(0)
    expect(screen.getByText('jordan_dev')).toBeInTheDocument()
    expect(screen.getByText(/Webhooks stopped firing after yesterday's release/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('New question received')
  })

  it('moves through retrieval, drafting, and independent confidence review', () => {
    render(<AnimatedChat />)

    act(() => vi.advanceTimersByTime(1400))
    expect(screen.getByText('Searching product knowledge')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Searching connected knowledge')

    act(() => vi.advanceTimersByTime(1700))
    expect(screen.getByText(/signature validation became stricter/)).toBeInTheDocument()
    expect(screen.getByText('Webhook signature migration guide ↗')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Drafting a grounded answer')

    act(() => vi.advanceTimersByTime(1800))
    expect(screen.getByRole('status')).toHaveTextContent('Reviewing answer confidence')
    expect(screen.getByText('96%')).toBeInTheDocument()
  })

  it('posts the answer automatically only after the confidence review completes', () => {
    render(<AnimatedChat />)

    act(() => vi.advanceTimersByTime(1400))
    act(() => vi.advanceTimersByTime(1700))
    act(() => vi.advanceTimersByTime(1800))
    act(() => vi.advanceTimersByTime(1600))

    expect(screen.getByRole('status')).toHaveTextContent('Answer posted automatically')
    expect(screen.getByText('Auto-answered')).toBeInTheDocument()
    expect(screen.getByText('No human review needed')).toBeInTheDocument()
    expect(screen.getByText('2.8s · 3 cited sources')).toBeInTheDocument()
  })

  it('fades and restarts the workflow without leaving stale posted state', () => {
    render(<AnimatedChat />)

    act(() => vi.advanceTimersByTime(1400))
    act(() => vi.advanceTimersByTime(1700))
    act(() => vi.advanceTimersByTime(1800))
    act(() => vi.advanceTimersByTime(1600))
    act(() => vi.advanceTimersByTime(3600))
    expect(screen.getByRole('status')).toHaveTextContent('Restarting workflow demo')

    act(() => vi.advanceTimersByTime(600))
    expect(screen.getByRole('status')).toHaveTextContent('New question received')
    expect(screen.queryByText('Auto-answered')).not.toBeInTheDocument()
  })

  it('shows the completed workflow without timers when reduced motion is preferred', () => {
    mockMotionPreference(true)
    render(<AnimatedChat />)

    expect(screen.getByRole('status')).toHaveTextContent('Answer posted automatically')
    expect(screen.getByText('Auto-answered')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(20000))
    expect(screen.getByRole('status')).toHaveTextContent('Answer posted automatically')
  })

  it('cleans up pending timers on unmount', () => {
    const { unmount } = render(<AnimatedChat />)
    act(() => vi.advanceTimersByTime(2500))
    expect(() => unmount()).not.toThrow()
    act(() => vi.advanceTimersByTime(20000))
  })
})
