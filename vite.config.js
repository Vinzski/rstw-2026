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

    // `publicDir: 'public'` is the one always-needed piece in dev — it's
    // what makes Vite's own server actually serve `public/`, so absolute
    // paths like `.bg-motif-texture`'s background-image (resolved against
    // whichever origin served the stylesheet — Vite's, in dev) don't 404.
    //
    // The `server` override below is a *separate*, opt-in concern: only
    // for sharing dev through an ngrok/devtunnel URL, which changes every
    // session, so it's read from `.env` (VITE_DEV_SERVER_ORIGIN) rather
    // than hardcoded. It only applies when that var is actually set —
    // forcing `origin`/`hmr.clientPort: 443` with nothing set makes the
    // `@vite()` directive emit invalid asset URLs for plain local dev
    // (no tunnel in front), breaking the page outright. With the var
    // unset, Vite just uses its own correct built-in dev server defaults.
    ...(command === 'serve'
      ? {
          publicDir: 'public',
          ...(env.VITE_DEV_SERVER_ORIGIN
            ? {
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
            : {}),
        }
      : { publicDir: false }),
  }
})