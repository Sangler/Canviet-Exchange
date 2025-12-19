import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import store from '../store/store'
import '../styles/globals.css'
import '../scss/style.scss'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import BrowserCompatibilityWarning from '../components/BrowserCompatibilityWarning'
import ErrorBoundary from '../components/ErrorBoundary'

function AppContentInner({ Component, pageProps }: { Component: AppProps['Component']; pageProps: AppProps['pageProps'] }) {
  const router = useRouter()
    const { token, user } = useAuth()

  useEffect(() => {
    // Allow access to help page, login, terms and oauth callback pages
    const allowedPaths = ['/general/help', '/general/terms-and-conditions', 'help', '/terms-and-conditions', '/oauth-callback']
    const isAllowedPath = allowedPaths.some(path => router.pathname.startsWith(path))

    const kyc = (user?.KYCStatus || user?.kycStatus || '').toString()
    const isSuspended = !!user && (kyc === 'suspended' || (user as any).suspended === true)

    if (isSuspended && !isAllowedPath) {
      router.replace('/general/help')
    }
  }, [router.pathname, user, token])

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
            <AppContentInner Component={Component} pageProps={pageProps} />
          </AuthProvider>
        </LanguageProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default MyApp
