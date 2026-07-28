import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // laravel-vite-plugin turns this off by default (Laravel's own server
  // owns public/, and outDir below lives inside it, so copying publicDir
  // into outDir on build would recursively duplicate the whole public/
  // folder into itself). But CSS/JS here reference public assets with
  // plain absolute paths (e.g. `.bg-motif-texture`'s background-image,
  // resolved against whichever origin served the file) — in dev that's
  // Vite's own server, not Laravel's, so it needs to serve public/ too.
  // Only turned on for `vite`/`npm run dev` (command === 'serve'), never
  // for the build.
  publicDir: command === 'serve' ? 'public' : false,
  plugins: [
    laravel({
      input: [
        'resources/css/app.css',
        'resources/js/main.jsx',
        'resources/js/face-recognition.jsx',
      ],
      refresh: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: ['**/storage/framework/views/**'],
    },
  },
}))
