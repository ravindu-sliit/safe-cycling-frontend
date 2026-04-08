import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ImageKitProvider } from '@imagekit/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const imagekitConfig = {
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/2pe3sztjq',
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_sjn1AZ3gn73eBggHIICoEXJUZqM=',
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ImageKitProvider urlEndpoint={imagekitConfig.urlEndpoint} publicKey={imagekitConfig.publicKey}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ImageKitProvider>
  </StrictMode>,
)
