import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import store from '../store/store'
import '../scss/style.scss'
import { AuthProvider } from '../context/AuthContext'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const showHeader = !router.pathname.startsWith('/admin')
  return (
    <Provider store={store}>
      <AuthProvider>
        {showHeader && <SiteHeader />}
        <Component {...pageProps} />
        {showHeader && <SiteFooter />}
      </AuthProvider>
    </Provider>
  )
}

export default MyApp
