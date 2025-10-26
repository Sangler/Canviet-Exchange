import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import store from '../store/store'
import '../styles/globals.css'
import '../scss/style.scss'
import { AuthProvider } from '../context/AuthContext'


function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()


  return (
    <Provider store={store}>
      <AuthProvider>
                  <Component {...pageProps} />
      </AuthProvider>
    </Provider>
  )
}

export default MyApp
