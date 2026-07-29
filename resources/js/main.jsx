import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import FaceRecognitionPage from './facerec/FaceRecognitionPage.jsx'

// One route (`/`), one bundle: the VIP check-in kiosk plays first, and
// once its own flow finishes it hands off to the real landing page —
// entirely client-side, no server redirect to a second page/URL.
function Root() {
  const [verified, setVerified] = useState(false)
  const handleFinished = useCallback(() => setVerified(true), [])

  return verified ? <App /> : <FaceRecognitionPage onFinished={handleFinished} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
