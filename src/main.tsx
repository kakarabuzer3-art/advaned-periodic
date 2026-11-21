import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const container = document.getElementById('root')!
const root = createRoot(container)

// App is loaded dynamically so that a dataset that fails validation produces a
// clear error screen instead of a blank page.
import('./App.tsx')
  .then(({ default: App }) => root.render(<StrictMode><App /></StrictMode>))
  .catch((error: unknown) => {
    console.error(error)
    root.render(
      <main role="alert" className="mx-auto mt-16 max-w-xl rounded-xl border border-line bg-panel p-6">
        <h1 className="text-xl font-bold">The element data could not be loaded</h1>
        <p className="mt-2 text-sm text-muted">
          The dataset failed validation, so nothing is shown rather than showing wrong science. Details are in the browser console.
        </p>
      </main>,
    )
  })
