'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from './logo'

const STEP_DURATIONS = [1400, 1700, 1800, 1600, 3600, 600] as const

const STEP_LABELS = [
  'New question received',
  'Searching connected knowledge',
  'Drafting a grounded answer',
  'Reviewing answer confidence',
  'Answer posted automatically',
  'Restarting workflow demo',
] as const

const PIPELINE = [
  { label: 'Understand', detail: 'how_to · webhook', step: 0 },
  { label: 'Retrieve', detail: '3 sources matched', step: 1 },
  { label: 'Draft', detail: 'Grounded response', step: 2 },
  { label: 'Review', detail: '96% confidence', step: 3 },
  { label: 'Resolve', detail: 'Posted to Discord', step: 4 },
] as const

function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function AnimatedChat() {
  const [step, setStep] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => {
      setReducedMotion(media.matches)
      if (media.matches) setStep(4)
    }

    updateMotionPreference()
    media.addEventListener('change', updateMotionPreference)
    return () => media.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setTimeout(
      () => setStep((current) => (current + 1) % STEP_DURATIONS.length),
      STEP_DURATIONS[step],
    )
    return () => window.clearTimeout(timer)
  }, [reducedMotion, step])

  const visibleStep = step === 5 ? 4 : step
  const faded = step === 5

  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#080d1b] shadow-[0_42px_120px_rgba(0,0,0,0.62),0_0_0_1px_rgba(96,165,250,0.04)]"
      data-step={step}
      aria-label="Animated AnswerLoops support workflow"
    >
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />

      <div className="relative flex h-11 items-center justify-between border-b border-white/8 bg-white/[0.035] px-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="hidden items-center gap-2 text-[0.6875rem] text-white/45 sm:flex">
            <LogoMark size={16} />
            AnswerLoops live workspace
          </div>
        </div>
        <div className="flex items-center gap-2 text-[0.625rem] font-medium text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </div>
      </div>

      <div
        className={`relative grid min-h-[500px] transition duration-500 sm:min-h-[540px] md:grid-cols-[148px_minmax(0,1fr)_230px] ${
          faded ? 'scale-[0.985] opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <aside className="hidden border-r border-white/8 bg-black/15 p-3 md:block">
          <div className="mb-5 flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-[0.625rem] font-bold text-white">
              DV
            </div>
            <div>
              <div className="text-[0.625rem] font-semibold text-white/80">DevVault</div>
              <div className="text-[0.5rem] text-white/30">12,842 members</div>
            </div>
          </div>
          <div className="mb-2 px-2 text-[0.5rem] font-semibold uppercase tracking-[0.18em] text-white/25">Channels</div>
          {['# announcements', '# general', '# support', '# api-help'].map((channel) => (
            <div
              key={channel}
              className={`mb-0.5 rounded-md px-2 py-1.5 text-[0.625rem] ${
                channel === '# support' ? 'bg-blue-500/12 font-medium text-blue-200' : 'text-white/35'
              }`}
            >
              {channel}
            </div>
          ))}
          <div className="mt-6 mb-2 px-2 text-[0.5rem] font-semibold uppercase tracking-[0.18em] text-white/25">AnswerLoops</div>
          <div className="flex items-center gap-2 rounded-md bg-white/[0.035] px-2 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[0.5625rem] text-white/50">Watching 4 channels</span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-white/8 px-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="text-white/25">#</span>
              <span className="text-xs font-semibold text-white/85">support</span>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[0.5625rem] text-white/35">
              AnswerLoops is listening
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-hidden px-4 py-5 sm:px-5">
            <div className="flex gap-3 opacity-45">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[0.625rem] font-bold text-white">M</div>
              <div>
                <div className="mb-1 text-[0.625rem]">
                  <span className="font-semibold text-white/80">maya_ops</span>
                  <span className="ml-2 text-white/25">Today at 9:41 AM</span>
                </div>
                <p className="text-[0.6875rem] leading-relaxed text-white/55">The deploy guide fixed it — thank you!</p>
              </div>
            </div>

            <div className="demo-enter flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[0.625rem] font-bold text-white">J</div>
              <div className="min-w-0">
                <div className="mb-1 text-[0.625rem]">
                  <span className="font-semibold text-white/85">jordan_dev</span>
                  <span className="ml-2 text-white/25">Today at 9:42 AM</span>
                </div>
                <p className="max-w-md text-[0.6875rem] leading-[1.65] text-white/70 sm:text-xs">
                  Webhooks stopped firing after yesterday&apos;s release. Signatures fail even though our secret didn&apos;t change — any ideas?
                </p>
              </div>
            </div>

            {visibleStep >= 1 && visibleStep < 4 && (
              <div className="demo-enter flex gap-3">
                <LogoMark size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-[0.625rem]">
                    <span className="font-semibold text-white/85">AnswerLoops</span>
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[0.5rem] font-bold text-blue-200">APP</span>
                  </div>
                  {visibleStep === 1 && (
                    <div className="max-w-sm rounded-lg border border-blue-400/15 bg-blue-500/[0.06] p-3">
                      <div className="mb-2 flex items-center gap-2 text-[0.625rem] font-medium text-blue-200">
                        <SearchIcon />
                        Searching product knowledge
                      </div>
                      <div className="space-y-1.5">
                        <div className="demo-shimmer h-1.5 w-full rounded-full bg-white/8" />
                        <div className="demo-shimmer h-1.5 w-4/5 rounded-full bg-white/8 [animation-delay:120ms]" />
                      </div>
                    </div>
                  )}
                  {visibleStep >= 2 && (
                    <div className="demo-enter max-w-md text-[0.6875rem] leading-[1.65] text-white/70 sm:text-xs">
                      <p>
                        Found it — signature validation became stricter in yesterday&apos;s release. Return a <code className="rounded bg-white/8 px-1 py-0.5 text-cyan-200">200</code> before processing the payload asynchronously, then verify against the raw request body.
                      </p>
                      <div className="mt-2.5 rounded-lg border-l-2 border-blue-400 bg-blue-500/[0.08] px-3 py-2">
                        <div className="text-[0.5625rem] text-white/30">answerloops.com/docs</div>
                        <div className="mt-0.5 text-[0.625rem] font-medium text-blue-200">Webhook signature migration guide ↗</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visibleStep >= 4 && (
              <div className="demo-enter flex gap-3">
                <LogoMark size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[0.625rem]">
                    <span className="font-semibold text-white/85">AnswerLoops</span>
                    <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[0.5rem] font-bold text-blue-200">APP</span>
                    <span className="ml-2 text-white/25">Today at 9:42 AM</span>
                  </div>
                  <p className="max-w-md text-[0.6875rem] leading-[1.65] text-white/70 sm:text-xs">
                    Found it — signature validation became stricter in yesterday&apos;s release. Return a <code className="rounded bg-white/8 px-1 py-0.5 text-cyan-200">200</code> before processing the payload asynchronously, then verify against the raw request body.
                  </p>
                  <div className="mt-2.5 max-w-sm rounded-lg border-l-2 border-blue-400 bg-blue-500/[0.08] px-3 py-2">
                    <div className="text-[0.5625rem] text-white/30">answerloops.com/docs</div>
                    <div className="mt-0.5 text-[0.625rem] font-medium text-blue-200">Webhook signature migration guide ↗</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/8 px-2.5 py-1 text-[0.5625rem] font-medium text-emerald-300">
                      <CheckIcon className="h-3 w-3" />
                      Auto-answered
                    </span>
                    <span className="text-[0.5625rem] text-white/25">2.8s · 3 cited sources</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[0.625rem] text-white/20 sm:mx-5">
            Message #support
            <span className="ml-auto rounded border border-white/8 px-1.5 py-0.5 text-[0.5rem]">⌘ K</span>
          </div>
        </div>

        <aside className="hidden border-l border-white/8 bg-black/10 p-4 md:block">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[0.625rem] font-semibold text-white/70">Live workflow</span>
            <span className="rounded-full bg-blue-500/12 px-2 py-1 text-[0.5rem] font-medium text-blue-200">Ticket #2841</span>
          </div>

          <div className="relative space-y-1">
            <div className="absolute bottom-5 left-[11px] top-5 w-px bg-white/8" />
            <div
              className="demo-progress absolute left-[11px] top-5 w-px origin-top bg-gradient-to-b from-blue-400 to-cyan-300 transition-[height] duration-700"
              style={{ height: `${Math.max(0, visibleStep) * 47}px` }}
            />
            {PIPELINE.map((item) => {
              const active = visibleStep === item.step
              const complete = visibleStep > item.step
              return (
                <div key={item.label} className="relative flex min-h-[46px] gap-3">
                  <div
                    className={`relative z-10 mt-1 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                      complete
                        ? 'border-blue-400 bg-blue-500 text-white'
                        : active
                          ? 'border-cyan-300 bg-cyan-300/15 text-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.25)]'
                          : 'border-white/10 bg-[#0b1120] text-white/20'
                    }`}
                  >
                    {complete ? <CheckIcon className="h-3 w-3" /> : <span className="text-[0.5rem]">{item.step + 1}</span>}
                  </div>
                  <div className={`pt-0.5 transition-opacity duration-500 ${active || complete ? 'opacity-100' : 'opacity-35'}`}>
                    <div className="text-[0.5625rem] font-medium text-white/80">{item.label}</div>
                    <div className={`mt-0.5 text-[0.5rem] ${active ? 'text-cyan-200/80' : 'text-white/25'}`}>{item.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
            <div className="mb-2 flex items-center justify-between text-[0.5rem] uppercase tracking-[0.14em] text-white/25">
              Confidence
              <span className={visibleStep >= 3 ? 'text-emerald-300' : 'text-white/25'}>
                {visibleStep >= 3 ? '96%' : '—'}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/8">
              <div className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-1000 ${visibleStep >= 3 ? 'w-[96%]' : 'w-0'}`} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[0.5rem] text-white/30">
              <span className={`h-1.5 w-1.5 rounded-full ${visibleStep >= 4 ? 'bg-emerald-400' : 'bg-white/15'}`} />
              {visibleStep >= 4 ? 'No human review needed' : 'Threshold: 90%'}
            </div>
          </div>
        </aside>
      </div>

      <div className="relative grid grid-cols-3 border-t border-white/8 bg-black/20">
        {[
          ['2.8 sec', 'time to answer'],
          ['3', 'grounding sources'],
          ['0', 'human touches'],
        ].map(([value, label]) => (
          <div key={label} className="border-r border-white/8 px-3 py-3 text-center last:border-r-0 sm:py-3.5">
            <div className="text-xs font-semibold text-white sm:text-sm">{value}</div>
            <div className="mt-0.5 text-[0.5rem] text-white/30 sm:text-[0.5625rem]">{label}</div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {STEP_LABELS[step]}
      </span>
    </div>
  )
}
