'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="da">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Kritisk fejl</h1>
          <p style={{ fontSize: 14, color: '#555' }}>
            En uventet fejl opstod. Genindlæs siden.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              borderRadius: 6,
              border: '1px solid #ccc',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  )
}
