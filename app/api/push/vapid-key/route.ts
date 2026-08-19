export async function GET() {
  return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null })
}
