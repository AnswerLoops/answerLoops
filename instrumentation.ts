export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('@/lib/db/migrate')
    await runMigrations()

    const { logSignupPosture } = await import('@/lib/auth/signup-posture')
    logSignupPosture()
  }
}
