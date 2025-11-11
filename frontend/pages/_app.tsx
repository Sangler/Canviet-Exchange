import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import store from '../store/store'
import '../styles/globals.css'
import '../scss/style.scss'
import { AuthProvider } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'


function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()


  return (
    <Provider store={store}>
      <LanguageProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </LanguageProvider>
    </Provider>
  )
}

export default MyApp
