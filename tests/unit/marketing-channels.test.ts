import { describe, it, expect } from 'vitest'
import {
  MARKETED_CHANNELS,
  MARKETED_CHANNEL_NAMES,
  ALSO_SUPPORTED_CHANNELS,
  channelListSentence,
} from '@/lib/marketing/channels'

describe('canonical marketed channel list', () => {
  it('is the agreed set, in the agreed order', () => {
    expect(MARKETED_CHANNEL_NAMES).toEqual([
      'Discord',
      'Slack',
      'Discourse',
      'Circle',
      'GitHub',
      'Telegram',
      'Email',
      'Website widget',
    ])
  })

  it('does not put Google Chat in the headline list', () => {
    expect(MARKETED_CHANNEL_NAMES).not.toContain('Google Chat')
    expect(ALSO_SUPPORTED_CHANNELS).toContain('Google Chat')
  })

  it('gives every rail channel a hex color', () => {
    for (const c of MARKETED_CHANNELS) {
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('renders an Oxford-comma sentence with the overridable last label', () => {
    expect(channelListSentence()).toBe(
      'Discord, Slack, Discourse, Circle, GitHub, Telegram, Email, and a website widget',
    )
    expect(channelListSentence('web chat')).toMatch(/, and web chat$/)
  })
})
