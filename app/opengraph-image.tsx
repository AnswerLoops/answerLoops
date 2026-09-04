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
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f3', padding: '64px', color: '#171717', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 32, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 16, height: 16, borderRadius: 9999, background: 'linear-gradient(to right, #2563eb, #06b6d4)' }} />answer<span style={{ color: '#3b82f6' }}>Loops</span></div>
          <div style={{ display: 'flex', border: '1px solid #bfdbfe', borderRadius: 9999, padding: '9px 18px', color: '#1d4ed8', background: '#eff6ff', fontSize: 16 }}>OPEN SOURCE · AGPL</div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: 48 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '58%' }}>
            <div style={{ color: '#2563eb', fontSize: 17, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 22 }}>AI SUPPORT FOR COMMUNITY-LED TEAMS</div>
            <div style={{ fontSize: 61, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.045em' }}>Support that lives in your community.</div>
            <div style={{ marginTop: 24, fontSize: 25, color: '#686868', lineHeight: 1.35 }}>Grounded answers, independent review, and human escalation across every channel.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '36%', height: 290, borderRadius: 22, background: '#252525', padding: 28, color: '#fff' }}>
            <div style={{ color: '#93c5fd', fontSize: 15, fontWeight: 700, letterSpacing: '0.12em' }}>ONE SUPPORT LOOP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 24 }}>
              {['Discord · Slack', 'GitHub · Forums', 'Email · Web chat'].map((channel) => <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', fontSize: 17 }}><span style={{ width: 9, height: 9, borderRadius: 9999, background: '#60a5fa' }} />{channel}</div>)}
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', color: '#bfdbfe', fontSize: 16, fontWeight: 600 }}>Confidence gate → reply or review</div>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: '#686868' }}>Open source · Self-hostable · MCP / REST API</div>
      </div>
    ),
    { ...size },
  )
}
