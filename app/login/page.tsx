import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LoginForm } from '@/components/login-form'
import { Logo } from '@/components/logo'

export const dynamic = 'force-dynamic'

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: 'Could not start sign-in. Try again.',
  OAuthCallback: 'Sign-in was cancelled or failed. Try again.',
  OAuthCreateAccount: 'Could not create account. Try again.',
  OAuthAccountNotLinked: 'This email is already linked to another provider.',
  Callback: 'Sign-in callback failed. Try again.',
  AccessDenied: 'AnswerLoops is currently invite-only. Join the waitlist at answerloops.com.',
  Default: 'Something went wrong. Try again.',
}

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  if (await auth()) {
    redirect('/dashboard')
  }

  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-brand-50 to-brand-100/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(239,246,255,0.9),_transparent_50%)]" />
      <div className="relative w-full max-w-sm animate-[softRise_0.45s_ease-out]">
        <div className="rounded-2xl border border-border bg-surface/95 backdrop-blur-sm px-8 py-10 shadow-xl shadow-brand-900/5">
          <div className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <Link href="/">
                <Logo width={120} />
              </Link>
            </div>
            <p className="mt-1 text-sm text-ink-500">Create a free workspace or sign in</p>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <LoginForm />

          <p className="mt-6 text-center text-xs text-ink-400">
            By continuing, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}
