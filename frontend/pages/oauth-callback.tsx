import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { setAuthToken } from '../lib/auth'
import { useLanguage } from '../context/LanguageContext'

export default function OAuthCallback() {
  const router = useRouter()
  const { t } = useLanguage()
  const [status, setStatus] = useState<string>(t('common.loading'))

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const q = router.query
      const token = typeof q.token === 'string' ? q.token : (q.token && Array.isArray(q.token) ? q.token[0] : undefined)

      // If a token was provided in the query (legacy flow), store it temporarily in session storage
      if (token) {
        try { setAuthToken(token, { persistent: false, setCookie: false }) } catch {}
      }

      // Clear pending referral from sessionStorage after successful OAuth if present
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingReferral');
      }

      try {
        // Attempt to fetch user profile; this works when the server set an HttpOnly cookie
        const meResp = await fetch('/api/users/me', { credentials: 'include' })

        if (!meResp.ok) {
          // If fetch failed and we had a token in query, the legacy fallback may still work
          if (token) {
            // try again; server may accept Authorization header if cookie wasn't set
            const fallback = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
            if (!fallback.ok) throw new Error('Failed to fetch user profile')
            const meData = await fallback.json()
            const user = meData?.user
            const profileComplete = meData?.complete
            setStatus(t('auth.redirecting'))
            if (user?.role === 'user' && !profileComplete) void coordinateRedirect(router, '/personal-info')
            else void coordinateRedirect(router, '/transfers')
            return
          }
          throw new Error('Failed to fetch user profile')
        }

        const meData = await meResp.json()
        const user = meData?.user
        const profileComplete = meData?.complete

        setStatus(t('auth.redirecting'))

        // Check if profile is complete for regular users
        if (user?.role === 'user' && !profileComplete) {
          void coordinateRedirect(router, '/personal-info')
        } else {
          void coordinateRedirect(router, '/transfers')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('Error processing authentication')
        void coordinateRedirect(router, '/login?error=auth_processing_failed')
      }
    }

    if (router.isReady) {
      void handleOAuthCallback()
    }
  }, [router, router.isReady])

  return (
    <div className="page-center-flex">
      <div>{status}</div>
      <div className="spinner" aria-label="Loading">⏳</div>
    </div>
  )
}
