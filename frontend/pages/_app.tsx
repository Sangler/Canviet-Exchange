import { Provider } from 'react-redux'
import type { AppProps } from 'next/app'
import store from '../store/store'
import '../scss/style.scss'
import '@coreui/coreui/dist/css/coreui.min.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  )
}

export default MyApp
