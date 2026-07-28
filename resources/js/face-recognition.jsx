import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FaceRecognitionPage from './facerec/FaceRecognitionPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FaceRecognitionPage />
  </StrictMode>,
)
