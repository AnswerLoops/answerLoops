// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileDrawer } from '@/components/ui/mobile-drawer'

describe('MobileDrawer', () => {
  it('renders a trigger button and no drawer content until opened', () => {
    render(
      <MobileDrawer triggerLabel="Open navigation">
        <a href="/features">Features</a>
      </MobileDrawer>
    )
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument()
    expect(screen.queryByText('Features')).not.toBeInTheDocument()
  })

  it('opens the drawer and renders children when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MobileDrawer triggerLabel="Open navigation">
        <a href="/features">Features</a>
      </MobileDrawer>
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })

  it('renders the open drawer into document.body via a portal, not inline', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div data-testid="local-root">
        <MobileDrawer triggerLabel="Open navigation">
          <a href="/features">Features</a>
        </MobileDrawer>
      </div>
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    // The drawer content is not a descendant of the component's own render tree —
    // it's portaled to document.body, which is what makes it immune to an ancestor's
    // backdrop-blur/transform establishing a CSS containing block that would otherwise
    // confine a plain `fixed` overlay to that ancestor's box instead of the viewport.
    expect(container.querySelector('[data-testid="local-root"] a')).toBeNull()
    expect(document.body.querySelector('a[href="/features"]')).not.toBeNull()
  })

  it('closes the drawer when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MobileDrawer triggerLabel="Open navigation">
        <a href="/features">Features</a>
      </MobileDrawer>
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(screen.getByText('Features')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByText('Features')).not.toBeInTheDocument()
  })

  it('closes the drawer when a child (e.g. a nav link) is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MobileDrawer triggerLabel="Open navigation">
        <a href="/features">Features</a>
      </MobileDrawer>
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(screen.getByText('Features'))
    expect(screen.queryByText('Features')).not.toBeInTheDocument()
  })

  it('closes the drawer when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { baseElement } = render(
      <MobileDrawer triggerLabel="Open navigation">
        <a href="/features">Features</a>
      </MobileDrawer>
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const backdrop = baseElement.querySelector('.bg-black\\/40')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)
    expect(screen.queryByText('Features')).not.toBeInTheDocument()
  })

  it('applies a custom trigger className', () => {
    render(
      <MobileDrawer triggerLabel="Open navigation" triggerClassName="md:hidden">
        <span>content</span>
      </MobileDrawer>
    )
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveClass('md:hidden')
  })
})
