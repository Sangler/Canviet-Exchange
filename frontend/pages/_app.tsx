import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Script from 'next/script'
import store from '../store/store'
import '../styles/globals.css'
import '../scss/style.scss'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import BrowserCompatibilityWarning from '../components/BrowserCompatibilityWarning'
import ErrorBoundary from '../components/ErrorBoundary'

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const { token } = useAuth()

  useEffect(() => {
    // Allow access to help page, terms and oauth callback pages
    const allowedPaths = ['/general/help', '/general/terms-and-conditions', 'help', '/terms-and-conditions', '/oauth-callback']
    const isAllowedPath = allowedPaths.some(path => router.pathname.startsWith(path))

    if (token && !isAllowedPath) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.suspended === true || payload.kycStatus === 'suspended') {
          router.replace('/general/help')
        }
      } catch (e) {
        console.error('Failed to parse token:', e)
      }
    }
  }, [router.pathname, token])

  return <Component {...pageProps} />
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <LanguageProvider>
          <AuthProvider>
            <BrowserCompatibilityWarning />
            <Script src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" strategy="afterInteractive" />
            <AppContent Component={Component} pageProps={pageProps} />
          </AuthProvider>
        </LanguageProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default MyApp
