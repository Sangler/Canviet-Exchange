import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import store from '../store/store'
import '../scss/style.scss'
import { AuthProvider } from '../context/AuthContext'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import AppSidebar from '../components/AppSidebar'
import AppHeader from '../components/AppHeader'
import { CContainer } from '@coreui/react'

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  // Use the CoreUI shell (sidebar + header + body) on dashboard-style routes
  const appShellRoots = ['/', '/users', '/analytics', '/settings', '/colors', '/typography', '/base', '/buttons', '/forms', '/charts', '/icons', '/notifications', '/widgets', '/transfers']
  const useAppShell = appShellRoots.some((p) => router.pathname === p || router.pathname.startsWith(p + '/'))
  const showSiteChrome = !router.pathname.startsWith('/admin') && !useAppShell

  return (
    <Provider store={store}>
      <AuthProvider>
        {useAppShell ? (
          <div>
            <AppSidebar />
            <div className="wrapper d-flex flex-column min-vh-100">
              <AppHeader />
              <div className="body flex-grow-1">
                <CContainer className="px-4" lg>
                  <Component {...pageProps} />
                </CContainer>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showSiteChrome && <SiteHeader />}
            <Component {...pageProps} />
            {showSiteChrome && <SiteFooter />}
          </>
        )}
      </AuthProvider>
    </Provider>
  )
}

export default MyApp
