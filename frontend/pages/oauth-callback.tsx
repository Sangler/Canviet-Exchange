import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useLanguage } from '../context/LanguageContext'

export default function OAuthCallback() {
  const router = useRouter()
  const { t } = useLanguage()
  const [status, setStatus] = useState<string>(t('common.loading'))

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const q = router.query
      const otk = typeof q.otk === 'string' ? q.otk : (q.otk && Array.isArray(q.otk) ? q.otk[0] : undefined)
      const token = typeof q.token === 'string' ? q.token : (q.token && Array.isArray(q.token) ? q.token[0] : undefined)

      // Clear pending referral from sessionStorage after successful OAuth if present
      if (typeof window !== 'undefined') sessionStorage.removeItem('pendingReferral')

      try {
        // If an OTK is present (dev flow), exchange it for an HttpOnly cookie
        if (otk) {
          try {
            await fetch('/api/auth/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ otk }),
            })
          } catch (e) {
            // ignore; next fetch will fail if exchange didn't work
          }
        }

        // Small delay to allow browser to process Set-Cookie
        await new Promise((r) => setTimeout(r, 300))

        // Attempt to fetch user profile; this works when the server set an HttpOnly cookie
        const meResp = await fetch('/api/users/me', { credentials: 'include' })
        if (!meResp.ok) {
          // Legacy fallback: if server returned a token in query, try Authorization header
          if (token) {
            const fallback = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
            if (!fallback.ok) throw new Error('Failed to fetch user profile')
            const meData = await fallback.json()
            const user = meData?.user
            const profileComplete = meData?.complete
            setStatus(t('auth.redirecting'))
            if (user?.role === 'user' && !profileComplete) void router.push('/personal-info')
            else void router.push('/transfers')
            return
          }
          throw new Error('Failed to fetch user profile')
        }

        const meData = await meResp.json()
        const user = meData?.user
        const profileComplete = meData?.complete

        setStatus(t('auth.redirecting'))
        if (user?.role === 'user' && !profileComplete) {
          void router.push('/personal-info')
        } else {
          void router.push('/transfers')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('Error processing authentication')
        void router.push('/login?error=auth_processing_failed')
      }
    }

    if (router.isReady) void handleOAuthCallback()
  }, [router, router.isReady, t])

  return (
    <div className="page-center-flex">
      <div>{status}</div>
      <div className="spinner" aria-label="Loading">⏳</div>
    </div>
  )
}
