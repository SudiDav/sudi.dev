import { ImageResponse } from 'next/og'

export const alt = 'Sudi M. David — Full-Stack Engineer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 78px',
          background: '#0b0b10',
          color: '#f4f5fb',
          fontFamily: 'Arial',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              background: '#607ebc',
              color: '#0b0b10',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {'</>'}
          </div>
          <span style={{ fontSize: 26, color: '#9eb9f6', letterSpacing: 2 }}>SUDI.DEV</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 66, fontWeight: 700 }}>Sudi M. David</span>
          <span style={{ fontSize: 32, color: '#a9abb8' }}>Full-Stack Engineer</span>
          <span style={{ fontSize: 22, color: '#607ebc' }}>
            Building the systems institutions run on.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5c6070', fontSize: 20 }}>
          <span>fintech · platforms · thoughtful code</span>
          <span>https://sudi.dev</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
