import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import FaceRecognitionPage from './facerec/FaceRecognitionPage.jsx'
import MuteButton from './components/MuteButton.jsx'

// One route (`/`), one bundle: the VIP check-in kiosk plays first, and
// once its own flow finishes it hands off to the real landing page —
// entirely client-side, no server redirect to a second page/URL. The mute
// button is mounted here, above both phases, so it's available for the
// whole visit rather than only once the real site's own chrome is up.
function Root() {
  const [verified, setVerified] = useState(false)
  const handleFinished = useCallback(() => setVerified(true), [])

  return (
    <>
      {verified ? <App /> : <FaceRecognitionPage onFinished={handleFinished} />}
      <MuteButton />
    </>
  )
}

const container = document.getElementById('root')
// Some browser security software (content-scanning proxies like Kaspersky's
// web protection) has been observed re-requesting this entry script under a
// second, cache-busted URL, which makes this module execute twice on a
// single page load. Each execution used to call `createRoot` fresh, so two
// independent React roots ended up managing the same container — harmless
// until the first big structural swap (the VIP check-in handing off to the
// real site once it finishes), where their conflicting bookkeeping throws
// (`removeChild`/`insertBefore` "not a child of this node") and React
// unmounts everything, leaving a blank page. Stashing the root on the
// container means a second execution reuses it — a no-op `render` call —
// instead of creating a competing one.
const root = container._reactRoot ?? (container._reactRoot = createRoot(container))
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
