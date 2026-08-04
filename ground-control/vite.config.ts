import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // basicSsl only enabled via `npm run dev:phone` (HTTPS=1) — camera/GPS/compass
  // require a secure context on a real phone, but plain HTTP is simpler for
  // day-to-day desktop dev, so it stays off by default.
  plugins: [react(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: process.env.HTTPS ? true : undefined,
  },
})
