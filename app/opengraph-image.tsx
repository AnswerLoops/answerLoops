import { ImageResponse } from 'next/og'

// Default social-share card for every route that doesn't define its own.
// Next wires this into both the OpenGraph and Twitter image slots. The old
// setup pointed both at the 900×900 square logo, which social platforms
// letterbox badly and which reads as "no card" on X/LinkedIn/Slack unfurls.
export const alt = 'AnswerLoops — AI support that lives in your community'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0b1220 0%, #131c33 100%)',
          padding: '80px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700 }}>
          AnswerLoops
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            AI support that lives in your community
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
            Answer repeat questions in Discord, Slack, forums, GitHub, Telegram &amp; email —
            only when the answer is confident enough to be right.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
          Open source · Self-hostable · MCP / API-ready
        </div>
      </div>
    ),
    { ...size },
  )
}
