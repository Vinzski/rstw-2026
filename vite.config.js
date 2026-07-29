import { defineConfig, loadEnv } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // `loadEnv` (not `process.env`) is what actually reads the project's
  // `.env` file here — Vite only auto-exposes `VITE_`-prefixed vars to
  // client code via `import.meta.env`, not to this config file itself.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // laravel-vite-plugin turns this off by default (Laravel's own server
    // owns public/, and outDir below lives inside it, so copying publicDir
    // into outDir on build would recursively duplicate the whole public/
    // folder into itself). But CSS/JS here reference public assets with
    // plain absolute paths (e.g. `.bg-motif-texture`'s background-image,
    // resolved against whichever origin served the file) — in dev that's
    // Vite's own server, not Laravel's, so it needs to serve public/ too.
    // Only turned on for `vite`/`npm run dev` (command === 'serve'), never
    // for the build.
    plugins: [
      laravel({
        input: [
          'resources/css/app.css',
          'resources/js/main.jsx',
        ],
        refresh: true,
      }),
      react(),
      tailwindcss(),
    ],
  }
})


/*

    // Only needed for `vite`/`npm run dev` — the ngrok/devtunnel URL
    // changes every session, so it's read from `.env` (VITE_DEV_SERVER_ORIGIN)
    // rather than hardcoded. Without `origin` set to the tunnel's own https
    // URL, the `@vite()` directive bakes the unreachable loopback address
    // (`http://[::1]:5173`) into every asset/HMR request, which the browser
    // then blocks as cross-origin once it's loading the page from the
    // tunnel's origin instead.
    ...(command === 'serve'
      ? {
          publicDir: 'public',
          server: {
            host: true,
            port: 5173,
            strictPort: true,
            cors: true,
            origin: env.VITE_DEV_SERVER_ORIGIN,
            allowedHosts: true,
            hmr: { clientPort: 443 },
          },
        }
      : { publicDir: false }), */