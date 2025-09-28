import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import store from '../store/store'
import '../scss/style.scss'
import { AuthProvider } from '../context/AuthContext'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </Provider>
  )
}

export default MyApp
