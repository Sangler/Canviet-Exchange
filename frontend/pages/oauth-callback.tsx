import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { setAuthToken } from '../lib/auth'

export default function OAuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<string>('Processing...')

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const q = router.query
      const token = typeof q.token === 'string' ? q.token : (q.token && Array.isArray(q.token) ? q.token[0] : undefined)
      
      if (!token) {
        setStatus('Authentication failed')
        void router.replace('/login?error=oauth_failed')
        return
      }

      try {
        // Save token (session storage by default)
        setAuthToken(token, { persistent: false, setCookie: false })
        
        // Fetch user profile to check completeness
        const meResp = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!meResp.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const meData = await meResp.json()
        const user = meData?.user
        const profileComplete = meData?.complete
        
        setStatus('Redirecting...')
        
        // Check if profile is complete for regular users
        if (user?.role === 'user' && !profileComplete) {
          void router.replace('/personal-info')
        } else {
          void router.replace('/transfers')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('Error processing authentication')
        void router.replace('/login?error=auth_processing_failed')
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
