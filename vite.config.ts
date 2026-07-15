import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // base './' garante que o build funcione em subpastas do Hostinger (hPanel/FTP)
  base: './',
  plugins: [react(), tailwindcss()],
})
